import abc
import re
from typing import Iterable, Dict, Any


class Scraper(abc.ABC):
    store: str

    @abc.abstractmethod
    def fetch(self) -> Iterable[Dict[str, Any]]:
        """Yield: sku, name, price, currency, product_url, in_stock"""


def slugify_name(name: str) -> str:
    """Create a stable SKU-like slug from a product name across providers."""
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower())
    return slug.strip("-")
