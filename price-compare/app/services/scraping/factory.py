from typing import Iterable, List
from ...domain.enums import ShopName
from .base import BaseScraper


class ScraperFactory:
    """Factory pattern: builds scraper instances per shop."""

    def __init__(self):
        # Lazy imports avoid circular dependencies at app startup time.
        from ..providers.gjirafamall import GjirafaMallScraper
        from ..providers.gjirafamall_single import GjirafaMallIphone16Scraper
        from ..providers.aztech import AztechScraper
        from ..providers.shopaz import ShopAzScraper
        from ..providers.neptun import NeptunKSScraper

        self._registry: dict[ShopName, list[type[BaseScraper]]] = {
            ShopName.GJIRAFAMALL: [GjirafaMallScraper, GjirafaMallIphone16Scraper],
            ShopName.AZTECH: [AztechScraper],
            ShopName.SHOPAZ: [ShopAzScraper],
            ShopName.NEPTUN: [NeptunKSScraper],
        }

    def build_all(self, shops: Iterable[ShopName] | None = None) -> List[BaseScraper]:
        targets = list(shops) if shops else list(self._registry.keys())
        scrapers: List[BaseScraper] = []
        for shop in targets:
            classes = self._registry.get(shop, [])
            for cls in classes:
                scrapers.append(cls())
        return scrapers
