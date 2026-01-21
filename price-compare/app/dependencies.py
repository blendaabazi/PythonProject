"""Dependency wiring for FastAPI and background jobs."""

from functools import lru_cache
from .infrastructure.mongo.connection import get_database, get_auth_database
from .infrastructure.mongo.repositories import (
    MongoProductRepository,
    MongoShopRepository,
    MongoPriceRepository,
    MongoUserRepository,
)
from .infrastructure.caching import CachingPriceRepository
from .services.scraping.factory import ScraperFactory
from .services.ingestion_service import IngestionService
from .services.compare_service import ComparisonService
from .services.pricing import default_pricing_strategies, PricingStrategy
from .services.email_service import EmailService
from .config import settings


@lru_cache(maxsize=1)
def get_product_repo():
    return MongoProductRepository(get_database())


@lru_cache(maxsize=1)
def get_shop_repo():
    return MongoShopRepository(get_database())


@lru_cache(maxsize=1)
def get_price_repo():
    return CachingPriceRepository(MongoPriceRepository(get_database()))


@lru_cache(maxsize=1)
def get_user_repo():
    return MongoUserRepository(get_auth_database())


@lru_cache(maxsize=1)
def get_scrapers():
    factory = ScraperFactory()
    return tuple(factory.build_all())


@lru_cache(maxsize=1)
def get_pricing_strategies() -> tuple[PricingStrategy, ...]:
    return tuple(default_pricing_strategies())


@lru_cache(maxsize=1)
def get_ingestion_service():
    return IngestionService(
        product_repo=get_product_repo(),
        shop_repo=get_shop_repo(),
        price_repo=get_price_repo(),
        scrapers=get_scrapers(),
        pricing_strategies=get_pricing_strategies(),
    )


@lru_cache(maxsize=1)
def get_comparison_service():
    return ComparisonService(
        product_repo=get_product_repo(),
        price_repo=get_price_repo(),
    )


@lru_cache(maxsize=1)
def get_email_service() -> EmailService:
    return EmailService(
        host=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user,
        password=settings.smtp_password,
        from_email=settings.smtp_from or settings.smtp_user,
        use_tls=settings.smtp_use_tls,
        use_ssl=settings.smtp_use_ssl,
        timeout_sec=settings.smtp_timeout_sec,
    )
