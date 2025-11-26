import datetime as dt
from . import SCRAPERS
from ..database import products_col, stores_col, prices_col

def upsert_store(name: str):
    stores_col.update_one({"name": name}, {"": {"name": name}}, upsert=True)
    return stores_col.find_one({"name": name})["_id"]

def upsert_product(item):
    products_col.update_one({"sku": item["sku"]}, {"": {"name": item["name"]}}, upsert=True)
    return products_col.find_one({"sku": item["sku"]})["_id"]

def run_all():
    now = dt.datetime.utcnow()
    for scraper in SCRAPERS:
        store_id = upsert_store(scraper.store)
        for item in scraper.fetch():
            product_id = upsert_product(item)
            prices_col.insert_one({
                "product_id": product_id,
                "store_id": store_id,
                "price": item["price"],
                "currency": item["currency"],
                "product_url": item["product_url"],
                "in_stock": item["in_stock"],
                "timestamp": now,
            })
