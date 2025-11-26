from fastapi import APIRouter, Query
from ..database import products_col, prices_col

router = APIRouter(prefix="/products", tags=["products"])

@router.get("/")
def list_products(q: str | None = Query(None, description="search by name")):
    filt = {"name": {"": q, "": "i"}} if q else {}
    return list(products_col.find(filt, {"_id": 0, "name": 1, "sku": 1}))

@router.get("/{sku}/prices")
def product_prices(sku: str):
    product = products_col.find_one({"sku": sku})
    if not product:
        return []
    pipeline = [
        {"": {"product_id": product["_id"]}},
        {"": {"from": "stores", "localField": "store_id", "foreignField": "_id", "as": "store"}},
        {"": ""},
        {"": {"price": 1}},
    ]
    results = list(prices_col.aggregate(pipeline))
    return [
        {
            "store": r["store"]["name"],
            "price": r["price"],
            "currency": r["currency"],
            "product_url": r["product_url"],
            "timestamp": r["timestamp"],
        }
        for r in results
    ]
