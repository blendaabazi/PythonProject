import abc
from dataclasses import replace
from typing import Iterable, List
from ..domain.models import PricePoint


class PricingStrategy(abc.ABC):
    """Contract for price transformations before persistence."""

    @abc.abstractmethod
    def apply(self, price: PricePoint) -> PricePoint:
        ...


class NoOpPricingStrategy(PricingStrategy):
    def apply(self, price: PricePoint) -> PricePoint:
        return price


class NormalizeCurrencyStrategy(PricingStrategy):
    """Ensure currency code is uppercase and default to EUR."""

    def __init__(self, default_currency: str = "EUR") -> None:
        self.default_currency = default_currency

    def apply(self, price: PricePoint) -> PricePoint:
        currency = (price.currency or self.default_currency).upper()
        return replace(price, currency=currency)


class RoundPriceStrategy(PricingStrategy):
    """Round price to 2 decimals for consistency."""

    def apply(self, price: PricePoint) -> PricePoint:
        return replace(price, price=round(price.price, 2))


def apply_pricing_strategies(price: PricePoint, strategies: Iterable[PricingStrategy]) -> PricePoint:
    updated = price
    for strategy in strategies:
        updated = strategy.apply(updated)
    return updated


def default_pricing_strategies() -> List[PricingStrategy]:
    return [NormalizeCurrencyStrategy(), RoundPriceStrategy()]
