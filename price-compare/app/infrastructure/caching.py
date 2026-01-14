from __future__ import annotations

import functools
from typing import Dict, List
from ..domain.models import PricePoint
from ..domain.repositories import PriceRepository


class CachingPriceRepository(PriceRepository):
    """Decorator repository that caches read queries."""

    def __init__(self, inner: PriceRepository) -> None:
        self.inner = inner
        self._latest_cache: Dict[str, List[PricePoint]] = {}
        self._history_cache: Dict[tuple[str, int], List[PricePoint]] = {}
        self._cheapest_cache: Dict[tuple[str, int], List[PricePoint]] = {}

    def _invalidate(self, product_sku: str | None = None) -> None:
        if product_sku:
            self._latest_cache.pop(product_sku, None)
            keys = [k for k in self._history_cache if k[0] == product_sku]
            for key in keys:
                self._history_cache.pop(key, None)
        else:
            self._latest_cache.clear()
            self._history_cache.clear()
        self._cheapest_cache.clear()

    def add_price(self, price: PricePoint, product_id: str, store_id: str) -> str:
        self._invalidate(price.product_sku)
        return self.inner.add_price(price, product_id, store_id)

    def latest_for_product(self, product_sku: str) -> List[PricePoint]:
        if product_sku in self._latest_cache:
            return self._latest_cache[product_sku]
        result = self.inner.latest_for_product(product_sku)
        self._latest_cache[product_sku] = result
        return result

    def history_for_product(self, product_sku: str, limit: int = 30) -> List[PricePoint]:
        key = (product_sku, limit)
        if key in self._history_cache:
            return self._history_cache[key]
        result = self.inner.history_for_product(product_sku, limit=limit)
        self._history_cache[key] = result
        return result

    def cheapest_by_category(self, category: str, limit: int = 10) -> List[PricePoint]:
        key = (category, limit)
        if key in self._cheapest_cache:
            return self._cheapest_cache[key]
        result = self.inner.cheapest_by_category(category, limit=limit)
        self._cheapest_cache[key] = result
        return result

    def latest_stores_for_products(self, product_skus: List[str]) -> dict[str, List[str]]:
        return self.inner.latest_stores_for_products(product_skus)

    def latest_prices_for_products(self, product_skus: List[str]) -> dict[str, List[PricePoint]]:
        missing = [sku for sku in product_skus if sku not in self._latest_cache]
        if missing:
            fetched = self.inner.latest_prices_for_products(missing)
            self._latest_cache.update(fetched)
        return {sku: self._latest_cache.get(sku, []) for sku in product_skus}
