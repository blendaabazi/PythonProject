from fastapi import APIRouter, Depends, Query, HTTPException
from ..dependencies import get_comparison_service, get_product_repo
from ..schemas.models import CompareResponse, ProductResponse, PriceResponse

router = APIRouter(prefix="/compare", tags=["compare"])


def _product_to_response(product) -> ProductResponse:
    return ProductResponse(
        sku=product.sku,
        name=product.name,
        category=product.category.value,
        brand=product.brand,
    )


def _price_to_response(price) -> PriceResponse:
    return PriceResponse(
        store=price.store.display(),
        price=price.price,
        currency=price.currency,
        product_url=price.product_url,
        in_stock=price.in_stock,
        timestamp=price.timestamp,
    )


@router.get("/", response_model=CompareResponse)
def compare_prices(
    sku: str | None = Query(None, description="Product SKU to compare"),
    q: str | None = Query(None, description="Fallback: search term to choose first match"),
    comparison_service=Depends(get_comparison_service),
    product_repo=Depends(get_product_repo),
):
    target_sku = sku
    if target_sku is None and q:
        matches = product_repo.search(q)
        if matches:
            target_sku = matches[0].sku
    if target_sku is None:
        raise HTTPException(status_code=400, detail="Provide sku or q")

    product, offers, cheapest = comparison_service.compare(target_sku)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return CompareResponse(
        product=_product_to_response(product),
        offers=[_price_to_response(o) for o in offers],
        cheapest_store=cheapest.store.display() if cheapest else None,
    )
