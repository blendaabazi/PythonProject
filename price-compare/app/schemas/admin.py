from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class AdminStatsResponse(BaseModel):
    product_count: int
    shop_count: int
    price_count: int
    user_count: int
    latest_price_at: Optional[datetime] = None


class AdminCategorySummary(BaseModel):
    category: str
    count: int


class AdminStoreSummary(BaseModel):
    store: str
    count: int
    latest_price_at: Optional[datetime] = None


class AdminRecentPrice(BaseModel):
    sku: str
    name: Optional[str] = None
    store: str
    price: float
    currency: str
    in_stock: bool
    timestamp: datetime


class AdminSystemSummary(BaseModel):
    scrape_interval_min: int
    scrape_on_startup: bool
    scrape_timeout_sec: int
    scrape_retries: int
    scrape_backoff_sec: float
    scrape_delay_sec: float


class AdminInsightsResponse(BaseModel):
    products_by_category: List[AdminCategorySummary]
    prices_by_store: List[AdminStoreSummary]
    recent_prices: List[AdminRecentPrice]
    system: AdminSystemSummary


class AdminProductResponse(BaseModel):
    sku: str
    name: str
    category: str = Field(description="Product category identifier")
    brand: Optional[str] = None
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None


class AdminProductCreateRequest(BaseModel):
    sku: str = Field(min_length=1)
    name: str = Field(min_length=1)
    category: str = Field(description="Product category identifier")
    brand: Optional[str] = None
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None


class AdminProductUpdateRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None


class AdminProductListResponse(BaseModel):
    items: List[AdminProductResponse]
    total: int


class AdminShopResponse(BaseModel):
    code: str
    name: str


class AdminShopRequest(BaseModel):
    code: str = Field(min_length=1)
    name: str = Field(min_length=1)


class AdminShopUpdateRequest(BaseModel):
    name: str = Field(min_length=1)


class AdminShopListResponse(BaseModel):
    items: List[AdminShopResponse]
    total: int


class AdminUserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    role: str
    created_at: datetime


class AdminUserCreateRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)
    name: Optional[str] = Field(default=None, max_length=120)
    role: str = Field(default="user")


class AdminUserUpdateRequest(BaseModel):
    email: Optional[str] = Field(default=None, max_length=254)
    name: Optional[str] = Field(default=None, max_length=120)
    role: Optional[str] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)


class AdminUserListResponse(BaseModel):
    items: List[AdminUserResponse]
    total: int


class AdminDeleteResponse(BaseModel):
    status: str
    deleted_prices: Optional[int] = None
