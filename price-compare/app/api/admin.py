from dataclasses import dataclass
from datetime import datetime, timezone
from threading import Lock

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status

from ..dependencies import (
    get_product_repo,
    get_shop_repo,
    get_price_repo,
    get_user_repo,
    get_ingestion_service,
    get_current_user,
    require_admin,
)
from ..domain.enums import ProductCategory, ShopName
from ..domain.models import Product, Shop, User
from ..domain.repositories import RepositoryError
from ..infrastructure.mongo.connection import get_database
from ..schemas.admin import (
    AdminStatsResponse,
    AdminInsightsResponse,
    AdminCategorySummary,
    AdminStoreSummary,
    AdminRecentPrice,
    AdminSystemSummary,
    AdminScrapeResponse,
    AdminScrapeStatusResponse,
    AdminProductCreateRequest,
    AdminProductUpdateRequest,
    AdminProductResponse,
    AdminProductListResponse,
    AdminShopRequest,
    AdminShopUpdateRequest,
    AdminShopResponse,
    AdminShopListResponse,
    AdminUserCreateRequest,
    AdminUserUpdateRequest,
    AdminUserResponse,
    AdminUserListResponse,
    AdminDeleteResponse,
)
from ..services.auth_service import hash_password, ADMIN_EMAIL
from ..config import settings

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@dataclass
class _ScrapeState:
    running: bool = False
    total: int = 0
    completed: int = 0
    current_store: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    last_error: str | None = None


_scrape_state = _ScrapeState()
_scrape_lock = Lock()


def _run_scrape_with_progress(ingestion_service) -> None:
    now = datetime.now(timezone.utc)
    scrapers = list(getattr(ingestion_service, "scrapers", []))
    with _scrape_lock:
        _scrape_state.running = True
        _scrape_state.total = len(scrapers)
        _scrape_state.completed = 0
        _scrape_state.current_store = None
        _scrape_state.started_at = _scrape_state.started_at or now
        _scrape_state.finished_at = None
        _scrape_state.last_error = None
    for index, scraper in enumerate(scrapers, start=1):
        store_value = getattr(scraper, "store", None)
        store_label = getattr(store_value, "value", None) or str(store_value or "")
        with _scrape_lock:
            _scrape_state.current_store = store_label or None
        try:
            ingestion_service._ingest_scraper(scraper, now)
        except Exception as exc:
            with _scrape_lock:
                _scrape_state.last_error = str(exc) or "Scrape failed"
        finally:
            with _scrape_lock:
                _scrape_state.completed = index
    with _scrape_lock:
        _scrape_state.running = False
        _scrape_state.current_store = None
        _scrape_state.finished_at = datetime.now(timezone.utc)


def _normalize_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalize_urls(items: list[str] | None) -> list[str] | None:
    if items is None:
        return None
    cleaned = [item.strip() for item in items if item and item.strip()]
    return cleaned


def _normalize_email(value: str) -> str:
    return value.strip().lower()


def _normalize_role(value: str) -> str:
    role = value.strip().lower()
    if role not in {"user", "admin"}:
        raise HTTPException(status_code=400, detail="Invalid role")
    return role


def _coerce_price(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _to_product_response(product: Product) -> AdminProductResponse:
    return AdminProductResponse(
        sku=product.sku,
        name=product.name,
        category=product.category.value,
        brand=product.brand,
        image_url=product.image_url,
        image_urls=product.image_urls,
    )


def _to_user_response(user: User) -> AdminUserResponse:
    return AdminUserResponse(
        id=user.id or "",
        email=user.email,
        name=user.name,
        role=user.role,
        created_at=user.created_at,
    )


def _parse_category(value: str) -> ProductCategory:
    try:
        return ProductCategory(value)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid category") from exc


def _parse_shop_code(value: str) -> ShopName:
    try:
        return ShopName(value)
    except Exception:
        try:
            return ShopName.from_human(value)
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Invalid shop code") from exc


@router.get("/stats", response_model=AdminStatsResponse)
def admin_stats(
    product_repo=Depends(get_product_repo),
    shop_repo=Depends(get_shop_repo),
    price_repo=Depends(get_price_repo),
    user_repo=Depends(get_user_repo),
):
    return AdminStatsResponse(
        product_count=product_repo.count(),
        shop_count=shop_repo.count(),
        price_count=price_repo.count(),
        user_count=user_repo.count(),
        latest_price_at=price_repo.latest_timestamp(),
    )


@router.get("/insights", response_model=AdminInsightsResponse)
def admin_insights(
    limit: int = Query(8, ge=1, le=50),
):
    db = get_database()
    products = db["products"]
    prices = db["prices"]

    category_docs = list(
        products.aggregate(
            [
                {"$group": {"_id": "$category", "count": {"$sum": 1}}},
                {"$sort": {"count": -1, "_id": 1}},
            ]
        )
    )
    products_by_category = [
        AdminCategorySummary(category=doc.get("_id") or "unknown", count=int(doc.get("count", 0)))
        for doc in category_docs
    ]

    store_docs = list(
        prices.aggregate(
            [
                {"$group": {"_id": "$store_code", "count": {"$sum": 1}, "latest": {"$max": "$timestamp"}}},
                {"$sort": {"count": -1, "_id": 1}},
            ]
        )
    )
    prices_by_store = [
        AdminStoreSummary(
            store=doc.get("_id") or "unknown",
            count=int(doc.get("count", 0)),
            latest_price_at=doc.get("latest"),
        )
        for doc in store_docs
    ]

    recent_docs = list(
        prices.aggregate(
            [
                {"$sort": {"timestamp": -1}},
                {"$limit": limit},
                {
                    "$lookup": {
                        "from": "products",
                        "localField": "product_sku",
                        "foreignField": "sku",
                        "as": "product",
                    }
                },
                {"$unwind": {"path": "$product", "preserveNullAndEmptyArrays": True}},
                {
                    "$project": {
                        "product_sku": 1,
                        "store_code": 1,
                        "price": 1,
                        "currency": 1,
                        "in_stock": 1,
                        "timestamp": 1,
                        "product_name": "$product.name",
                    }
                },
            ]
        )
    )
    recent_prices = [
        AdminRecentPrice(
            sku=doc.get("product_sku") or "",
            name=doc.get("product_name"),
            store=doc.get("store_code") or "unknown",
            price=_coerce_price(doc.get("price")),
            currency=doc.get("currency") or "EUR",
            in_stock=bool(doc.get("in_stock", True)),
            timestamp=doc.get("timestamp"),
        )
        for doc in recent_docs
    ]

    system = AdminSystemSummary(
        scrape_interval_min=settings.scrape_interval_min,
        scrape_on_startup=settings.scrape_on_startup,
        scrape_timeout_sec=settings.scrape_timeout_sec,
        scrape_retries=settings.scrape_retries,
        scrape_backoff_sec=settings.scrape_backoff_sec,
        scrape_delay_sec=settings.scrape_delay_sec,
    )

    return AdminInsightsResponse(
        products_by_category=products_by_category,
        prices_by_store=prices_by_store,
        recent_prices=recent_prices,
        system=system,
    )


@router.post("/scrape", response_model=AdminScrapeResponse, status_code=status.HTTP_202_ACCEPTED)
def admin_scrape(
    background_tasks: BackgroundTasks,
    ingestion_service=Depends(get_ingestion_service),
):
    with _scrape_lock:
        if _scrape_state.running:
            return AdminScrapeResponse(status="running", message="Scrape already running")
        _scrape_state.running = True
        _scrape_state.total = len(getattr(ingestion_service, "scrapers", []))
        _scrape_state.completed = 0
        _scrape_state.current_store = None
        _scrape_state.started_at = datetime.now(timezone.utc)
        _scrape_state.finished_at = None
        _scrape_state.last_error = None
    background_tasks.add_task(_run_scrape_with_progress, ingestion_service)
    return AdminScrapeResponse(status="ok", message="Scrape started")


@router.get("/scrape/status", response_model=AdminScrapeStatusResponse)
def admin_scrape_status():
    with _scrape_lock:
        return AdminScrapeStatusResponse(
            running=_scrape_state.running,
            total=_scrape_state.total,
            completed=_scrape_state.completed,
            current_store=_scrape_state.current_store,
            started_at=_scrape_state.started_at,
            finished_at=_scrape_state.finished_at,
            last_error=_scrape_state.last_error,
        )


@router.get("/products", response_model=AdminProductListResponse)
def admin_list_products(
    q: str | None = Query(None, description="Search by name"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    product_repo=Depends(get_product_repo),
):
    products = product_repo.search(q, limit=limit, offset=offset)
    total = product_repo.count(q)
    return AdminProductListResponse(
        items=[_to_product_response(product) for product in products],
        total=total,
    )


@router.post("/products", response_model=AdminProductResponse, status_code=status.HTTP_201_CREATED)
def admin_create_product(
    payload: AdminProductCreateRequest,
    product_repo=Depends(get_product_repo),
):
    sku = payload.sku.strip()
    name = _normalize_text(payload.name)
    if not name:
        raise HTTPException(status_code=400, detail="Product name required")
    if product_repo.get_by_sku(sku):
        raise HTTPException(status_code=409, detail="Product already exists")
    category = _parse_category(payload.category)
    product = Product(
        sku=sku,
        name=name,
        category=category,
        brand=_normalize_text(payload.brand),
        image_url=_normalize_text(payload.image_url),
        image_urls=_normalize_urls(payload.image_urls),
    )
    product_repo.upsert(product)
    return _to_product_response(product)


@router.put("/products/{sku}", response_model=AdminProductResponse)
def admin_update_product(
    sku: str,
    payload: AdminProductUpdateRequest,
    product_repo=Depends(get_product_repo),
):
    existing = product_repo.get_by_sku(sku)
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No changes supplied")
    if "name" in updates:
        name = _normalize_text(updates["name"])
        if not name:
            raise HTTPException(status_code=400, detail="Product name required")
        existing.name = name
    if "category" in updates and updates["category"] is not None:
        existing.category = _parse_category(updates["category"])
    if "brand" in updates:
        existing.brand = _normalize_text(updates["brand"])
    if "image_url" in updates:
        if updates["image_url"] is None:
            existing.image_url = ""
        else:
            existing.image_url = _normalize_text(updates["image_url"])
    if "image_urls" in updates:
        existing.image_urls = _normalize_urls(updates["image_urls"])
    product_repo.upsert(existing)
    return _to_product_response(existing)


@router.delete("/products/{sku}", response_model=AdminDeleteResponse)
def admin_delete_product(
    sku: str,
    product_repo=Depends(get_product_repo),
    price_repo=Depends(get_price_repo),
):
    deleted = product_repo.delete(sku)
    if not deleted:
        raise HTTPException(status_code=404, detail="Product not found")
    deleted_prices = price_repo.delete_for_product(sku)
    return AdminDeleteResponse(status="ok", deleted_prices=deleted_prices)


@router.get("/shops", response_model=AdminShopListResponse)
def admin_list_shops(shop_repo=Depends(get_shop_repo)):
    shops = shop_repo.list_shops()
    return AdminShopListResponse(
        items=[AdminShopResponse(code=shop.code.value, name=shop.name) for shop in shops],
        total=shop_repo.count(),
    )


@router.post("/shops", response_model=AdminShopResponse, status_code=status.HTTP_201_CREATED)
def admin_create_shop(
    payload: AdminShopRequest,
    shop_repo=Depends(get_shop_repo),
):
    shop_code = _parse_shop_code(payload.code)
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Shop name required")
    shop = Shop(code=shop_code, name=name)
    shop_repo.upsert(shop)
    return AdminShopResponse(code=shop.code.value, name=shop.name)


@router.put("/shops/{code}", response_model=AdminShopResponse)
def admin_update_shop(
    code: str,
    payload: AdminShopUpdateRequest,
    shop_repo=Depends(get_shop_repo),
):
    shop_code = _parse_shop_code(code)
    existing = shop_repo.get_by_code(shop_code.value)
    if not existing:
        raise HTTPException(status_code=404, detail="Shop not found")
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Shop name required")
    existing.name = name
    shop_repo.upsert(existing)
    return AdminShopResponse(code=existing.code.value, name=existing.name)


@router.delete("/shops/{code}", response_model=AdminDeleteResponse)
def admin_delete_shop(
    code: str,
    shop_repo=Depends(get_shop_repo),
    price_repo=Depends(get_price_repo),
):
    shop_code = _parse_shop_code(code)
    deleted = shop_repo.delete(shop_code.value)
    if not deleted:
        raise HTTPException(status_code=404, detail="Shop not found")
    deleted_prices = price_repo.delete_for_store(shop_code.value)
    return AdminDeleteResponse(status="ok", deleted_prices=deleted_prices)


@router.get("/users", response_model=AdminUserListResponse)
def admin_list_users(
    q: str | None = Query(None, description="Search by email or name"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user_repo=Depends(get_user_repo),
):
    users = user_repo.list_users(q, limit=limit, offset=offset)
    total = user_repo.count(q)
    return AdminUserListResponse(
        items=[_to_user_response(user) for user in users],
        total=total,
    )


@router.post("/users", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
def admin_create_user(
    payload: AdminUserCreateRequest,
    user_repo=Depends(get_user_repo),
):
    email = _normalize_email(payload.email)
    if email == ADMIN_EMAIL:
        raise HTTPException(status_code=400, detail="Admin account is predefined")
    if user_repo.get_by_email(email):
        raise HTTPException(status_code=409, detail="User already exists")
    role = _normalize_role(payload.role or "user")
    user = User(
        email=email,
        name=_normalize_text(payload.name),
        role=role,
        password_hash=hash_password(payload.password),
    )
    try:
        user.id = user_repo.create(user)
    except RepositoryError as exc:
        detail = str(exc) or "Failed to create user"
        status_code = 409 if "exists" in detail.lower() else 500
        raise HTTPException(status_code=status_code, detail=detail) from exc
    return _to_user_response(user)


@router.put("/users/{user_id}", response_model=AdminUserResponse)
def admin_update_user(
    user_id: str,
    payload: AdminUserUpdateRequest,
    user_repo=Depends(get_user_repo),
):
    user = user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No changes supplied")
    if user.email == ADMIN_EMAIL:
        protected_fields = {"email", "role", "password"}
        if any(field in updates for field in protected_fields):
            raise HTTPException(status_code=400, detail="Admin account is predefined")
    if "email" in updates and updates["email"] is not None:
        normalized_email = _normalize_email(updates["email"])
        if normalized_email != user.email:
            if normalized_email == ADMIN_EMAIL:
                raise HTTPException(status_code=400, detail="Admin account is predefined")
            if user_repo.get_by_email(normalized_email):
                raise HTTPException(status_code=409, detail="User already exists")
            user.email = normalized_email
    if "name" in updates:
        user.name = _normalize_text(updates["name"])
    if "role" in updates and updates["role"] is not None:
        user.role = _normalize_role(updates["role"])
    if "password" in updates and updates["password"]:
        user.password_hash = hash_password(updates["password"])
    try:
        updated = user_repo.update(user)
    except RepositoryError as exc:
        detail = str(exc) or "Failed to update user"
        status_code = 409 if "exists" in detail.lower() else 500
        raise HTTPException(status_code=status_code, detail=detail) from exc
    return _to_user_response(updated)


@router.delete("/users/{user_id}", response_model=AdminDeleteResponse)
def admin_delete_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    user_repo=Depends(get_user_repo),
):
    user = user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.email == ADMIN_EMAIL:
        raise HTTPException(status_code=400, detail="Admin account is predefined")
    if current_user.id == user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    deleted = user_repo.delete(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
    return AdminDeleteResponse(status="ok")
