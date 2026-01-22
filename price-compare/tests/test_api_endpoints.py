from datetime import datetime, timezone
from typing import Dict, List, Optional

import pytest
from fastapi.testclient import TestClient

from app.dependencies import (
    get_comparison_service,
    get_price_repo,
    get_product_repo,
    get_shop_repo,
)
from app.domain.enums import ProductCategory, ShopName
from app.domain.models import PricePoint, Product, Shop
from app.domain.repositories import PriceRepository, ProductRepository, ShopRepository
from app.main import app
from app.services.comparison_service import ComparisonService


class InMemoryProductRepo(ProductRepository):
    def __init__(self) -> None:
        self.data: Dict[str, Product] = {}

    def upsert(self, product: Product) -> str:
        self.data[product.sku] = product
        return product.sku

    def get_by_sku(self, sku: str) -> Optional[Product]:
        return self.data.get(sku)

    def search(self, query: Optional[str] = None) -> List[Product]:
        if query is None:
            return list(self.data.values())
        needle = query.lower()
        return [p for p in self.data.values() if needle in p.name.lower()]


class InMemoryShopRepo(ShopRepository):
    def __init__(self) -> None:
        self.data: Dict[str, Shop] = {}

    def upsert(self, shop: Shop) -> str:
        self.data[shop.code.value] = shop
        return shop.code.value

    def list_shops(self) -> List[Shop]:
        return list(self.data.values())

    def get_by_code(self, code: str) -> Optional[Shop]:
        return self.data.get(code)


class InMemoryPriceRepo(PriceRepository):
    def __init__(self) -> None:
        self.data: List[PricePoint] = []

    def add_price(self, price: PricePoint, product_id: str, store_id: str) -> str:
        self.data.append(price)
        return str(len(self.data))

    def _latest_by_store(self, product_sku: str) -> Dict[str, PricePoint]:
        latest: Dict[str, PricePoint] = {}
        for price in sorted(self.data, key=lambda p: p.timestamp, reverse=True):
            if price.product_sku != product_sku:
                continue
            key = price.store.value
            if key not in latest:
                latest[key] = price
        return latest

    def latest_for_product(self, product_sku: str) -> List[PricePoint]:
        offers = list(self._latest_by_store(product_sku).values())
        offers.sort(key=lambda p: p.price)
        return offers

    def history_for_product(self, product_sku: str, limit: int = 30) -> List[PricePoint]:
        items = [p for p in self.data if p.product_sku == product_sku]
        return sorted(items, key=lambda p: p.timestamp, reverse=True)[:limit]

    def cheapest_by_category(self, category: str, limit: int = 10) -> List[PricePoint]:
        by_product: Dict[str, PricePoint] = {}
        for price in self.data:
            if price.product_sku not in by_product or price.price < by_product[price.product_sku].price:
                by_product[price.product_sku] = price
        cheapest = list(by_product.values())
        cheapest.sort(key=lambda p: p.price)
        return cheapest[:limit]

    def latest_stores_for_products(self, product_skus: List[str]) -> dict[str, List[str]]:
        stores: Dict[str, set[str]] = {sku: set() for sku in product_skus}
        for price in self.data:
            if price.product_sku in stores:
                stores[price.product_sku].add(price.store.value)
        return {sku: sorted(vals) for sku, vals in stores.items() if vals}

    def latest_prices_for_products(self, product_skus: List[str]) -> dict[str, List[PricePoint]]:
        result: Dict[str, List[PricePoint]] = {}
        for sku in product_skus:
            result[sku] = self.latest_for_product(sku)
        return result


@pytest.fixture()
def client():
    app.dependency_overrides.clear()
    product_repo = InMemoryProductRepo()
    price_repo = InMemoryPriceRepo()
    shop_repo = InMemoryShopRepo()

    shop_repo.upsert(Shop(code=ShopName.GJIRAFAMALL, name="Gjirafa"))
    shop_repo.upsert(Shop(code=ShopName.NEPTUN, name="Neptun KS"))

    product = Product(
        sku="iphone-15-pro",
        name="Apple iPhone 15 Pro 256GB",
        category=ProductCategory.SMARTPHONE,
        brand="Apple",
        image_url="https://cdn.test/iphone.jpg",
    )
    product_repo.upsert(product)

    price_repo.add_price(
        PricePoint(
            product_sku=product.sku,
            store=ShopName.NEPTUN,
            price=1219.0,
            currency="EUR",
            product_url="https://neptun.test/iphone-15-pro",
            in_stock=True,
            timestamp=datetime(2024, 1, 2, tzinfo=timezone.utc),
        ),
        "p1",
        "s1",
    )
    price_repo.add_price(
        PricePoint(
            product_sku=product.sku,
            store=ShopName.GJIRAFAMALL,
            price=1099.0,
            currency="EUR",
            product_url="https://gjirafa.test/iphone-15-pro",
            in_stock=True,
            timestamp=datetime(2024, 1, 3, tzinfo=timezone.utc),
        ),
        "p1",
        "s2",
    )

    app.dependency_overrides[get_product_repo] = lambda: product_repo
    app.dependency_overrides[get_price_repo] = lambda: price_repo
    app.dependency_overrides[get_shop_repo] = lambda: shop_repo
    app.dependency_overrides[get_comparison_service] = lambda: ComparisonService(product_repo, price_repo)

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_products_endpoint_returns_latest_prices_sorted(client: TestClient):
    resp = client.get("/products?q=iphone")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    prices = body[0]["latest_prices"]
    assert prices[0]["store"] == "gjirafamall"
    assert prices[0]["price"] == 1099.0
    assert prices[1]["store"] == "neptun"


def test_compare_endpoint_returns_cheapest_store(client: TestClient):
    resp = client.get("/compare", params={"sku": "iphone-15-pro"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["product"]["sku"] == "iphone-15-pro"
    assert body["cheapest_store"] == "GjirafaMall"
    assert body["offers"][0]["price"] == 1099.0


def test_prices_cheapest_endpoint_uses_latest_prices(client: TestClient):
    resp = client.get("/prices/cheapest", params={"category": "smartphone", "limit": 5})
    assert resp.status_code == 200
    body = resp.json()
    assert body[0]["price"] == 1099.0
    assert body[0]["store"] in {"GjirafaMall", "Neptun KS"}
