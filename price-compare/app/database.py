from .infrastructure.mongo.connection import get_database, get_auth_database

# Legacy module kept for backward compatibility with scripts.
db = get_database()
products_col = db["products"]
stores_col = db["shops"]
prices_col = db["prices"]
users_col = get_auth_database()["users"]


def ensure_indexes():
    products_col.create_index("sku", unique=True)
    stores_col.create_index("code", unique=True)
    prices_col.create_index([("product_sku", 1), ("store_code", 1), ("timestamp", -1)])
    users_col.create_index("email", unique=True)
