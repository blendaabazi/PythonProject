import abc
from typing import Iterable, Dict, Any

class Scraper(abc.ABC):
    store: str

    @abc.abstractmethod
    def fetch(self) -> Iterable[Dict[str, Any]]:
        """Yield: sku, name, price, currency, product_url, in_stock"""
