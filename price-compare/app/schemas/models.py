from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class StorePriceSummary(BaseModel):
    store: str
    price: float
    currency: str


class ProductResponse(BaseModel):
    sku: str
    name: str
    category: str = Field(description="Product category identifier")
    brand: Optional[str] = None
    stores: Optional[List[str]] = None
    latest_prices: Optional[List[StorePriceSummary]] = None


class ShopResponse(BaseModel):
    code: str
    name: str


class PriceResponse(BaseModel):
    store: str
    price: float
    currency: str
    product_url: str
    in_stock: bool
    timestamp: datetime


class CompareResponse(BaseModel):
    product: ProductResponse
    offers: List[PriceResponse]
    cheapest_store: Optional[str] = None
