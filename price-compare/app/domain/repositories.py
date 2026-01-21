import abc
from datetime import datetime
from typing import List, Optional
from .models import Product, Shop, PricePoint, User


class RepositoryError(Exception):
    """Raised when a repository operation fails."""


class ProductRepository(abc.ABC):
    @abc.abstractmethod
    def upsert(self, product: Product) -> str:
        """Insert or update a product and return its persistent id."""

    @abc.abstractmethod
    def get_by_sku(self, sku: str) -> Optional[Product]:
        """Fetch a single product."""

    @abc.abstractmethod
    def search(self, query: Optional[str] = None) -> List[Product]:
        """Search products by name or return all if query is None."""


class ShopRepository(abc.ABC):
    @abc.abstractmethod
    def upsert(self, shop: Shop) -> str:
        """Insert or update a shop and return its persistent id."""

    @abc.abstractmethod
    def list_shops(self) -> List[Shop]:
        """Return all registered shops."""

    @abc.abstractmethod
    def get_by_code(self, code: str) -> Optional[Shop]:
        """Return shop by stable code."""


class PriceRepository(abc.ABC):
    @abc.abstractmethod
    def add_price(self, price: PricePoint, product_id: str, store_id: str) -> str:
        """Persist a price observation and return its id."""

    @abc.abstractmethod
    def latest_for_product(self, product_sku: str) -> List[PricePoint]:
        """Return latest prices for a product across shops, sorted by price asc."""

    @abc.abstractmethod
    def history_for_product(self, product_sku: str, limit: int = 30) -> List[PricePoint]:
        """Return historical price points for a product ordered by timestamp desc."""

    @abc.abstractmethod
    def cheapest_by_category(self, category: str, limit: int = 10) -> List[PricePoint]:
        """Return cheapest price per product for a category."""

    @abc.abstractmethod
    def latest_stores_for_products(self, product_skus: List[str]) -> dict[str, List[str]]:
        """Return store codes that have prices for each product sku."""

    @abc.abstractmethod
    def latest_prices_for_products(self, product_skus: List[str]) -> dict[str, List[PricePoint]]:
        """Return latest price points per store for each product sku."""


class UserRepository(abc.ABC):
    @abc.abstractmethod
    def create(self, user: User) -> str:
        """Persist a new user and return its id."""

    @abc.abstractmethod
    def get_by_email(self, email: str) -> Optional[User]:
        """Fetch a user by email."""

    @abc.abstractmethod
    def update(self, user: User) -> User:
        """Update an existing user and return the updated instance."""

    @abc.abstractmethod
    def set_reset_token(self, user_id: str, token_hash: str, expires_at: datetime) -> None:
        """Store a password reset token hash with expiry."""

    @abc.abstractmethod
    def get_by_reset_token(self, token_hash: str, now: datetime) -> Optional[User]:
        """Fetch a user by valid reset token hash."""

    @abc.abstractmethod
    def clear_reset_token(self, user_id: str) -> None:
        """Clear password reset token fields."""
