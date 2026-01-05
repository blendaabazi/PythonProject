"""
Run a one-off ingest using the shared IngestionService wiring.

Usage:
    python scripts/manual_ingest.py
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.dependencies import get_ingestion_service, get_shop_repo
from app.infrastructure.mongo.connection import get_database


def main() -> None:
    service = get_ingestion_service()
    service.run_all()

    db = get_database()
    print("Ingest complete")
    print(
        {
            "products": db["products"].count_documents({}),
            "prices": db["prices"].count_documents({}),
            "shops": len(get_shop_repo().list_shops()),
        }
    )


if __name__ == "__main__":
    main()
