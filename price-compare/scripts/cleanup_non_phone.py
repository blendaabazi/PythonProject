"""
Remove non-phone products and their prices from the Mongo database.

Usage (dry run by default):
    python scripts/cleanup_non_phone.py
To actually delete:
    python scripts/cleanup_non_phone.py --execute
"""

import argparse
import sys
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")


def get_db():
    import app.config as cfg  # type: ignore

    settings = cfg.settings
    client = MongoClient(settings.mongo_uri, serverSelectionTimeoutMS=5000)
    return client[settings.mongo_db]


def main():
    parser = argparse.ArgumentParser(description="Delete non-phone products and related prices.")
    parser.add_argument("--execute", action="store_true", help="Perform deletions; otherwise dry run.")
    parser.add_argument(
        "--keywords",
        nargs="*",
        default=["iphone", "phone", "telefon", "celular"],
        help="Keywords that indicate a phone product.",
    )
    parser.add_argument(
        "--exclude",
        nargs="*",
        default=[
            "case",
            "cover",
            "kallf",
            "kellf",
            "kellef",
            "mbrojt",
            "spigen",
            "glass",
            "xham",
            "Ekran",
            "screen",
            "magsafe",
            "protector",
        ],
        help="Exclude products whose name contains any of these terms.",
    )
    args = parser.parse_args()

    db = get_db()
    products = db["products"]
    prices = db["prices"]

    include_regex = "|".join(args.keywords)
    exclude_regex = "|".join(args.exclude)

    # Candidates to keep: name matches keyword and does NOT match exclude keywords
    keep_filter = {
        "$and": [
            {"$or": [{"name": {"$regex": include_regex, "$options": "i"}}, {"category": "smartphone"}]},
            {"name": {"$not": {"$regex": exclude_regex, "$options": "i"}}},
        ]
    }
    keep_skus = {p["sku"] for p in products.find(keep_filter, {"sku": 1})}

    # Everything else is a delete candidate
    delete_cursor = products.find({"sku": {"$nin": list(keep_skus)}}, {"sku": 1, "name": 1})
    delete_skus = [doc["sku"] for doc in delete_cursor]

    if not delete_skus:
        print("No non-phone products found.")
        return

    print(f"Found {len(delete_skus)} products to delete (non-phone).")
    for sku in delete_skus[:10]:
        print("  sample:", sku)
    if len(delete_skus) > 10:
        print("  ...")

    if not args.execute:
        print("Dry run only. Re-run with --execute to delete.")
        return

    prod_result = products.delete_many({"sku": {"$in": delete_skus}})
    price_result = prices.delete_many({"product_sku": {"$in": delete_skus}})
    print(f"Deleted products: {prod_result.deleted_count}")
    print(f"Deleted price records: {price_result.deleted_count}")


if __name__ == "__main__":
    sys.exit(main())
