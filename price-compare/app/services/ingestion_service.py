import logging
from datetime import datetime, timezone
from typing import Iterable
from ..domain.models import Product, Shop, PricePoint
from ..domain.repositories import ProductRepository, ShopRepository, PriceRepository
from .scraping.base import BaseScraper

logger = logging.getLogger(__name__)


class IngestionService:
    """Application layer service responsible for ingesting scraped data."""

    def __init__(
        self,
        product_repo: ProductRepository,
        shop_repo: ShopRepository,
        price_repo: PriceRepository,
        scrapers: Iterable[BaseScraper],
    ):
        self.product_repo = product_repo
        self.shop_repo = shop_repo
        self.price_repo = price_repo
        self.scrapers = list(scrapers)

    def run_all(self) -> None:
        now = datetime.now(timezone.utc)
        for scraper in self.scrapers:
            self._ingest_scraper(scraper, now)

    def _ingest_scraper(self, scraper: BaseScraper, timestamp: datetime) -> None:
        logger.info("Scraping %s", scraper.store)
        try:
            shop = Shop(code=scraper.store, name=scraper.store.display())
            store_id = self.shop_repo.upsert(shop)
            for item in scraper.fetch():
                product = Product(
                    sku=item.sku,
                    name=item.name,
                    category=scraper.category,
                    brand=item.brand or "Apple",
                )
                product_id = self.product_repo.upsert(product)
                price = PricePoint(
                    product_sku=product.sku,
                    store=scraper.store,
                    price=item.price,
                    currency=item.currency,
                    product_url=item.product_url,
                    in_stock=item.in_stock,
                    timestamp=timestamp,
                )
                self.price_repo.add_price(price, product_id, store_id)
        except Exception as exc:
            logger.exception("Failed scraping %s: %s", scraper.store, exc)
