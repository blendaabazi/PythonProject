"""Dependency wiring for FastAPI and background jobs."""

from functools import lru_cache
from .infrastructure.mongo.connection import get_database
from .infrastructure.mongo.repositories import (
    MongoProductRepository,
    MongoShopRepository,
    MongoPriceRepository,
)
from .services.scraping.factory import ScraperFactory
from .services.ingestion_service import IngestionService
from .services.compare_service import ComparisonService


@lru_cache(maxsize=1)
def get_product_repo():
    return MongoProductRepository(get_database())


@lru_cache(maxsize=1)
def get_shop_repo():
    return MongoShopRepository(get_database())


@lru_cache(maxsize=1)
def get_price_repo():
    return MongoPriceRepository(get_database())


@lru_cache(maxsize=1)
def get_scrapers():
    factory = ScraperFactory()
    return tuple(factory.build_all())


@lru_cache(maxsize=1)
def get_ingestion_service():
    return IngestionService(
        product_repo=get_product_repo(),
        shop_repo=get_shop_repo(),
        price_repo=get_price_repo(),
        scrapers=get_scrapers(),
    )


@lru_cache(maxsize=1)
def get_comparison_service():
    return ComparisonService(
        product_repo=get_product_repo(),
        price_repo=get_price_repo(),
    )
