from datetime import datetime
from typing import List, Optional
from app.domain.enums import ProductCategory, ShopName
from app.domain.models import Product, PricePoint
from app.domain.repositories import ProductRepository, PriceRepository
from app.services.comparison_service import ComparisonService


class InMemoryProductRepo(ProductRepository):
    def __init__(self):
        self.data: dict[str, Product] = {}

    def upsert(self, product: Product) -> str:
        self.data[product.sku] = product
        return product.sku

    def get_by_sku(self, sku: str) -> Optional[Product]:
        return self.data.get(sku)

    def search(
        self,
        query: Optional[str] = None,
        limit: Optional[int] = None,
        offset: int = 0,
    ) -> List[Product]:
        items = list(self.data.values())
        if query:
            items = [p for p in items if query.lower() in p.name.lower()]
        offset = max(offset, 0)
        items = items[offset:]
        if limit is not None:
            items = items[:limit]
        return items

    def count(self, query: Optional[str] = None) -> int:
        return len(self.search(query))

    def delete(self, sku: str) -> bool:
        return self.data.pop(sku, None) is not None


class InMemoryPriceRepo(PriceRepository):
    def __init__(self):
        self.data: list[PricePoint] = []

    def add_price(self, price: PricePoint, product_id: str, store_id: str) -> str:
        self.data.append(price)
        return str(len(self.data))

    def latest_for_product(self, product_sku: str) -> List[PricePoint]:
        return sorted(
            [p for p in self.data if p.product_sku == product_sku],
            key=lambda p: p.price,
        )

    def history_for_product(self, product_sku: str, limit: int = 30) -> List[PricePoint]:
        items = [p for p in self.data if p.product_sku == product_sku]
        return sorted(items, key=lambda p: p.timestamp, reverse=True)[:limit]

    def cheapest_by_category(self, category: str, limit: int = 10) -> List[PricePoint]:
        return self.data[:limit]

    def latest_stores_for_products(self, product_skus: List[str]) -> dict[str, List[str]]:
        wanted = set(product_skus)
        store_map: dict[str, set[str]] = {sku: set() for sku in wanted}
        for price in self.data:
            if price.product_sku in wanted:
                store_map[price.product_sku].add(price.store.value)
        return {sku: sorted(stores) for sku, stores in store_map.items() if stores}

    def latest_prices_for_products(self, product_skus: List[str]) -> dict[str, List[PricePoint]]:
        wanted = set(product_skus)
        latest: dict[tuple[str, str], PricePoint] = {}
        for price in sorted(self.data, key=lambda p: p.timestamp, reverse=True):
            if price.product_sku not in wanted:
                continue
            key = (price.product_sku, price.store.value)
            if key in latest:
                continue
            latest[key] = price
        result: dict[str, List[PricePoint]] = {}
        for (sku, _), price in latest.items():
            result.setdefault(sku, []).append(price)
        for prices in result.values():
            prices.sort(key=lambda p: p.price)
        return result

    def count(self) -> int:
        return len(self.data)

    def latest_timestamp(self) -> Optional[datetime]:
        if not self.data:
            return None
        return max(price.timestamp for price in self.data)

    def delete_for_product(self, product_sku: str) -> int:
        before = len(self.data)
        self.data = [price for price in self.data if price.product_sku != product_sku]
        return before - len(self.data)

    def delete_for_store(self, store_code: str) -> int:
        before = len(self.data)
        self.data = [
            price
            for price in self.data
            if getattr(price.store, "value", price.store) != store_code
        ]
        return before - len(self.data)


def test_compare_returns_cheapest_store():
    prod_repo = InMemoryProductRepo()
    price_repo = InMemoryPriceRepo()
    product = Product(
        sku="iphone-15",
        name="iPhone 15",
        category=ProductCategory.SMARTPHONE,
        brand="Apple",
    )
    prod_repo.upsert(product)
    price_repo.add_price(
        PricePoint(
            product_sku="iphone-15",
            store=ShopName.NEPTUN,
            price=1200,
            currency="EUR",
            product_url="http://neptun.example/iphone-15",
            in_stock=True,
            timestamp=datetime(2024, 1, 1),
        ),
        "p1",
        "s1",
    )
    price_repo.add_price(
        PricePoint(
            product_sku="iphone-15",
            store=ShopName.AZTECH,
            price=1100,
            currency="EUR",
            product_url="http://aztech.example/iphone-15",
            in_stock=True,
            timestamp=datetime(2024, 1, 2),
        ),
        "p1",
        "s2",
    )

    service = ComparisonService(prod_repo, price_repo)
    product_out, offers, cheapest = service.compare("iphone-15")

    assert product_out is not None
    assert len(offers) == 2
    assert cheapest is not None
    assert cheapest.store == ShopName.AZTECH
    assert cheapest.price == 1100
