"""
Run a one-off ingest without the TecStore placeholder scraper.

Usage:
    python scripts/manual_ingest.py
"""

import datetime as dt
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.providers.gjirafamall import GjirafaMallScraper
from app.services.providers.gjirafamall_single import GjirafaMallIphone16Scraper
from app.services.providers.aztech import AztechScraper
from app.services.providers.shopaz import ShopAzScraper
from app.services.providers.neptun import NeptunKSScraper
from app.services.ingest import upsert_store, upsert_product
from app.database import products_col, stores_col, prices_col


SCRAPERS = [
    GjirafaMallScraper(),
    GjirafaMallIphone16Scraper(),
    AztechScraper(),
    ShopAzScraper(),
    NeptunKSScraper(),
]


def main() -> None:
    now = dt.datetime.now(dt.UTC)
    for scraper in SCRAPERS:
        print(f"Scraping {scraper.store}...")
        try:
            store_id = upsert_store(scraper.store)
            for item in scraper.fetch():
                product_id = upsert_product(item)
                prices_col.insert_one(
                    {
                        "product_id": product_id,
                        "store_id": store_id,
                        "price": item["price"],
                        "currency": item["currency"],
                        "product_url": item["product_url"],
                        "in_stock": item["in_stock"],
                        "timestamp": now,
                    }
                )
        except Exception as exc:  # catch network/timeouts etc.
            print(f"Skipping {scraper.store} due to error: {exc}")
            continue
        print(f"Done {scraper.store}")

    print(
        "counts:",
        {
            "products": products_col.count_documents({}),
            "prices": prices_col.count_documents({}),
            "stores": stores_col.count_documents({}),
        },
    )
    print("sample store:", stores_col.find_one({"name": "GjirafaMall"}, {"_id": 0}))
    print(
        "sample gjirafa price:",
        prices_col.find_one({"product_url": {"$regex": "gjirafamall"}}, {"_id": 0}),
    )


if __name__ == "__main__":
    main()
