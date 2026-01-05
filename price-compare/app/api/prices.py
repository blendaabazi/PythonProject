from fastapi import APIRouter, Depends, Query
from ..dependencies import get_comparison_service
from ..schemas.models import PriceResponse

router = APIRouter(prefix="/prices", tags=["prices"])


@router.get("/cheapest", response_model=list[PriceResponse])
def cheapest_by_category(
    category: str = Query("smartphone", description="Product category id"),
    limit: int = Query(10, ge=1, le=50),
    comparison_service=Depends(get_comparison_service),
):
    prices = comparison_service.cheapest_by_category(category, limit=limit)
    return [
        PriceResponse(
            store=price.store.display(),
            price=price.price,
            currency=price.currency,
            product_url=price.product_url,
            in_stock=price.in_stock,
            timestamp=price.timestamp,
        )
        for price in prices
    ]
