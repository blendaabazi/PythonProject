"""Dependency wiring for FastAPI and background jobs."""

from functools import lru_cache
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
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
from .services.comparison_service import ComparisonService
from .services.pricing import default_pricing_strategies, PricingStrategy
from .services.email_service import EmailService
from .config import settings
from .security.jwt import JWTError, decode_jwt
from .domain.models import User


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


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    user_repo=Depends(get_user_repo),
):
    token = None
    if credentials and credentials.scheme.lower() == "bearer":
        token = credentials.credentials
    if not token:
        token = request.cookies.get(settings.jwt_cookie_name)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    try:
        payload = decode_jwt(
            token,
            secret=settings.jwt_secret,
            issuer=settings.jwt_issuer,
            algorithms=(settings.jwt_algorithm,),
        )
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    subject = payload.get("sub")
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = user_repo.get_by_email(subject)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


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
