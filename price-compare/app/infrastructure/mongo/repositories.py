import logging
from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from pymongo.database import Database
from ...domain.enums import ProductCategory, ShopName
from ...domain.models import Product, Shop, PricePoint, User
from ...domain.repositories import (
    ProductRepository,
    ShopRepository,
    PriceRepository,
    UserRepository,
    RepositoryError,
)

logger = logging.getLogger(__name__)


def _object_id(value: str | ObjectId | None) -> ObjectId | None:
    if value is None:
        return None
    return value if isinstance(value, ObjectId) else ObjectId(value)


class MongoProductRepository(ProductRepository):
    def __init__(self, db: Database):
        self.collection = db["products"]
        self.collection.create_index("sku", unique=True)

    def upsert(self, product: Product) -> str:
        try:
            doc = {
                "sku": product.sku,
                "name": product.name,
                "category": product.category.value,
                "brand": product.brand,
            }
            if product.image_url is not None:
                doc["image_url"] = product.image_url
            if product.image_urls:
                doc["image_urls"] = product.image_urls
            saved = self.collection.find_one_and_update(
                {"sku": product.sku},
                {"$set": doc},
                upsert=True,
                return_document=ReturnDocument.AFTER,
            )
            return str(saved["_id"])
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.exception("Product upsert failed: %s", exc)
            raise RepositoryError from exc

    def get_by_sku(self, sku: str) -> Optional[Product]:
        doc = self.collection.find_one({"sku": sku})
        if not doc:
            return None
        category = doc.get("category", ProductCategory.SMARTPHONE.value)
        return Product(
            id=str(doc["_id"]),
            sku=doc["sku"],
            name=doc["name"],
            category=ProductCategory(category),
            brand=doc.get("brand"),
            image_url=doc.get("image_url"),
            image_urls=doc.get("image_urls"),
        )

    def search(self, query: Optional[str] = None) -> List[Product]:
        filter_ = {"name": {"$regex": query, "$options": "i"}} if query else {}
        results = []
        for doc in self.collection.find(
            filter_,
            {
                "_id": 1,
                "sku": 1,
                "name": 1,
                "category": 1,
                "brand": 1,
                "image_url": 1,
                "image_urls": 1,
            },
        ):
            category = doc.get("category", ProductCategory.SMARTPHONE.value)
            results.append(
                Product(
                    id=str(doc["_id"]),
                    sku=doc["sku"],
                    name=doc["name"],
                    category=ProductCategory(category),
                    brand=doc.get("brand"),
                    image_url=doc.get("image_url"),
                    image_urls=doc.get("image_urls"),
                )
            )
        return results


class MongoShopRepository(ShopRepository):
    def __init__(self, db: Database):
        self.collection = db["shops"]
        self.collection.create_index("code", unique=True)

    def upsert(self, shop: Shop) -> str:
        try:
            saved = self.collection.find_one_and_update(
                {"code": shop.code.value},
                {"$set": {"code": shop.code.value, "name": shop.name}},
                upsert=True,
                return_document=ReturnDocument.AFTER,
            )
            return str(saved["_id"])
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.exception("Shop upsert failed: %s", exc)
            raise RepositoryError from exc

    def list_shops(self) -> List[Shop]:
        shops: List[Shop] = []
        for doc in self.collection.find({}, {"_id": 1, "code": 1, "name": 1}):
            code = ShopName(doc["code"])
            shops.append(Shop(id=str(doc["_id"]), code=code, name=doc["name"]))
        return shops

    def get_by_code(self, code: str) -> Optional[Shop]:
        doc = self.collection.find_one({"code": code})
        if not doc:
            return None
        return Shop(id=str(doc["_id"]), code=ShopName(doc["code"]), name=doc["name"])


class MongoPriceRepository(PriceRepository):
    def __init__(self, db: Database):
        self.collection = db["prices"]
        self.collection.create_index([("product_sku", 1), ("store_code", 1), ("timestamp", -1)])
        self.collection.create_index("timestamp")
        self.products = db["products"]

    def add_price(self, price: PricePoint, product_id: str, store_id: str) -> str:
        try:
            doc = {
                "product_id": _object_id(product_id),
                "store_id": _object_id(store_id),
                "product_sku": price.product_sku,
                "store_code": price.store.value,
                "price": price.price,
                "currency": price.currency,
                "product_url": price.product_url,
                "in_stock": price.in_stock,
                "timestamp": price.timestamp,
            }
            inserted = self.collection.insert_one(doc)
            return str(inserted.inserted_id)
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.exception("Adding price failed: %s", exc)
            raise RepositoryError from exc

    def _doc_to_price(self, doc) -> PricePoint:
        code = doc.get("store_code") or doc.get("store") or ""
        try:
            store = ShopName(code)
        except Exception:
            try:
                store = ShopName.from_human(str(code))
            except Exception:
                store = ShopName.GJIRAFAMALL
        return PricePoint(
            id=str(doc.get("_id")),
            product_sku=doc["product_sku"],
            store=store,
            price=doc["price"],
            currency=doc["currency"],
            product_url=doc["product_url"],
            in_stock=doc.get("in_stock", True),
            timestamp=doc["timestamp"],
        )

    def latest_for_product(self, product_sku: str) -> List[PricePoint]:
        pipeline = [
            {"$match": {"product_sku": product_sku}},
            {"$sort": {"timestamp": -1}},
            {"$group": {"_id": "$store_code", "latest": {"$first": "$$ROOT"}}},
            {"$replaceRoot": {"newRoot": "$latest"}},
            {"$sort": {"price": 1}},
        ]
        docs = list(self.collection.aggregate(pipeline))
        return [self._doc_to_price(doc) for doc in docs]

    def history_for_product(self, product_sku: str, limit: int = 30) -> List[PricePoint]:
        cursor = (
            self.collection.find({"product_sku": product_sku})
            .sort("timestamp", -1)
            .limit(limit)
        )
        return [self._doc_to_price(doc) for doc in cursor]

    def cheapest_by_category(self, category: str, limit: int = 10) -> List[PricePoint]:
        pipeline = [
            {
                "$lookup": {
                    "from": "products",
                    "localField": "product_sku",
                    "foreignField": "sku",
                    "as": "product",
                }
            },
            {"$unwind": "$product"},
            {"$match": {"product.category": category}},
            {"$sort": {"timestamp": -1}},
            {"$group": {"_id": {"sku": "$product_sku", "store": "$store_code"}, "latest": {"$first": "$$ROOT"}}},
            {"$replaceRoot": {"newRoot": "$latest"}},
            {"$sort": {"price": 1}},
            {"$limit": limit},
        ]
        docs = list(self.collection.aggregate(pipeline))
        return [self._doc_to_price(doc) for doc in docs]

    def latest_stores_for_products(self, product_skus: List[str]) -> dict[str, List[str]]:
        if not product_skus:
            return {}
        pipeline = [
            {"$match": {"product_sku": {"$in": product_skus}}},
            {"$group": {"_id": "$product_sku", "stores": {"$addToSet": "$store_code"}}},
        ]
        docs = list(self.collection.aggregate(pipeline))
        return {doc["_id"]: sorted(doc.get("stores", [])) for doc in docs}

    def latest_prices_for_products(self, product_skus: List[str]) -> dict[str, List[PricePoint]]:
        if not product_skus:
            return {}
        pipeline = [
            {"$match": {"product_sku": {"$in": product_skus}}},
            {"$sort": {"timestamp": -1}},
            {"$group": {"_id": {"sku": "$product_sku", "store": "$store_code"}, "latest": {"$first": "$$ROOT"}}},
            {"$replaceRoot": {"newRoot": "$latest"}},
            {"$group": {"_id": "$product_sku", "offers": {"$push": "$$ROOT"}}},
        ]
        docs = list(self.collection.aggregate(pipeline))
        result: dict[str, List[PricePoint]] = {}
        for doc in docs:
            offers = [self._doc_to_price(item) for item in doc.get("offers", [])]
            offers.sort(key=lambda p: p.price)
            result[doc["_id"]] = offers
        return result


class MongoUserRepository(UserRepository):
    def __init__(self, db: Database):
        self.collection = db["users"]
        self.collection.create_index("email", unique=True)

    def create(self, user: User) -> str:
        try:
            doc = {
                "email": user.email,
                "password_hash": user.password_hash,
                "name": user.name,
                "created_at": user.created_at,
            }
            inserted = self.collection.insert_one(doc)
            return str(inserted.inserted_id)
        except DuplicateKeyError as exc:
            raise RepositoryError("User already exists") from exc
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.exception("User create failed: %s", exc)
            raise RepositoryError from exc

    def get_by_email(self, email: str) -> Optional[User]:
        doc = self.collection.find_one({"email": email})
        if not doc:
            return None
        created_at = doc.get("created_at") or datetime.now(timezone.utc)
        return User(
            id=str(doc["_id"]),
            email=doc["email"],
            password_hash=doc["password_hash"],
            name=doc.get("name"),
            created_at=created_at,
        )
