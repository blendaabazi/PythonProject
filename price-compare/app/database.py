from pymongo import MongoClient
from .config import settings

client = MongoClient(settings.mongo_uri, serverSelectionTimeoutMS=5000)
db = client[settings.mongo_db]
products_col = db["products"]
stores_col = db["stores"]
prices_col = db["prices"]

def ensure_indexes():
    products_col.create_index("sku", unique=True)
    prices_col.create_index([("product_id", 1), ("store_id", 1), ("timestamp", -1)])
