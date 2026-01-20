from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
from .enums import ProductCategory, ShopName


@dataclass(slots=True)
class Product:
    """Domain model for a product tracked across shops."""

    sku: str
    name: str
    category: ProductCategory = ProductCategory.SMARTPHONE
    brand: Optional[str] = None
    image_url: Optional[str] = None
    image_urls: Optional[list[str]] = None
    id: Optional[str] = None


@dataclass(slots=True)
class Shop:
    """Domain model for a shop/provider."""

    code: ShopName
    name: str
    id: Optional[str] = None


@dataclass(slots=True)
class PricePoint:
    """Time-series price observation for a product in a shop."""

    product_sku: str
    store: ShopName
    price: float
    currency: str
    product_url: str
    in_stock: bool
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    id: Optional[str] = None


@dataclass(slots=True)
class User:
    """Domain model for a registered user."""

    email: str
    password_hash: str
    name: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    id: Optional[str] = None
