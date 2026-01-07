from fastapi import APIRouter, Query, Depends, HTTPException
from ..dependencies import get_product_repo, get_comparison_service, get_price_repo
from ..schemas.models import ProductResponse, PriceResponse, StorePriceSummary
from ..domain.models import Product, PricePoint

router = APIRouter(prefix="/products", tags=["products"])


def _to_product_response(
    product: Product,
    stores: list[str] | None = None,
    latest_prices: list[StorePriceSummary] | None = None,
) -> ProductResponse:
    return ProductResponse(
        sku=product.sku,
        name=product.name,
        category=product.category.value,
        brand=product.brand,
        stores=stores,
        latest_prices=latest_prices,
    )


def _to_price_response(price: PricePoint) -> PriceResponse:
    return PriceResponse(
        store=price.store.display(),
        price=price.price,
        currency=price.currency,
        product_url=price.product_url,
        in_stock=price.in_stock,
        timestamp=price.timestamp,
    )


@router.get("/", response_model=list[ProductResponse])
def list_products(
    q: str | None = Query(None, description="search by name"),
    product_repo=Depends(get_product_repo),
    price_repo=Depends(get_price_repo),
):
    products = product_repo.search(q)
    if not products:
        return []
    offer_map = price_repo.latest_prices_for_products([p.sku for p in products])
    responses = []
    for product in products:
        offers = offer_map.get(product.sku, [])
        offers = [offer for offer in offers if offer.in_stock]
        if not offers:
            continue
        store_codes = [offer.store.value for offer in offers]
        latest_prices = [
            StorePriceSummary(store=offer.store.value, price=offer.price, currency=offer.currency)
            for offer in offers
        ]
        responses.append(_to_product_response(product, store_codes, latest_prices))
    return responses


@router.get("/{sku}", response_model=ProductResponse)
def product_detail(
    sku: str,
    product_repo=Depends(get_product_repo),
):
    product = product_repo.get_by_sku(sku)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return _to_product_response(product)


@router.get("/{sku}/prices", response_model=list[PriceResponse])
def product_prices(
    sku: str,
    comparison_service=Depends(get_comparison_service),
):
    product, offers, _ = comparison_service.compare(sku)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return [_to_price_response(price) for price in offers]


@router.get("/{sku}/history", response_model=list[PriceResponse])
def product_price_history(
    sku: str,
    limit: int = Query(30, ge=1, le=200),
    comparison_service=Depends(get_comparison_service),
):
    product, _, _ = comparison_service.compare(sku)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    history = comparison_service.history(sku, limit=limit)
    return [_to_price_response(price) for price in history]
