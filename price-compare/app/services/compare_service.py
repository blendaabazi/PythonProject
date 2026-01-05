from typing import List, Optional
from ..domain.models import Product, PricePoint
from ..domain.repositories import ProductRepository, PriceRepository


class ComparisonService:
    """Business logic for comparing prices across shops."""

    def __init__(self, product_repo: ProductRepository, price_repo: PriceRepository):
        self.product_repo = product_repo
        self.price_repo = price_repo

    def compare(self, sku: str) -> tuple[Optional[Product], List[PricePoint], Optional[PricePoint]]:
        product = self.product_repo.get_by_sku(sku)
        if not product:
            return None, [], None
        offers = self.price_repo.latest_for_product(product.sku)
        cheapest = min(offers, key=lambda p: p.price) if offers else None
        return product, offers, cheapest

    def history(self, sku: str, limit: int = 30) -> List[PricePoint]:
        return self.price_repo.history_for_product(sku, limit=limit)

    def cheapest_by_category(self, category: str, limit: int = 10) -> List[PricePoint]:
        return self.price_repo.cheapest_by_category(category, limit=limit)
