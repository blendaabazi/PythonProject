"""Legacy entrypoint kept for backwards compatibility.

Prefer using IngestionService directly, but run_all() is preserved so
older scripts keep working.
"""

from .ingestion_service import IngestionService
from ..dependencies import get_ingestion_service


def run_all() -> None:
    service: IngestionService = get_ingestion_service()
    service.run_all()
