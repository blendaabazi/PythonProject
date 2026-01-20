import logging
from functools import lru_cache
from pymongo import MongoClient
from pymongo.database import Database
from ...config import settings

logger = logging.getLogger(__name__)


class MongoConnection:
    """Singleton-style Mongo client provider.

    This implements the Singleton pattern to avoid multiple TCP pools
    across the application layers while keeping construction lazy.
    """

    _client: MongoClient | None = None

    @classmethod
    def client(cls) -> MongoClient:
        if cls._client is None:
            cls._client = MongoClient(
                settings.mongo_uri, serverSelectionTimeoutMS=5000
            )
            logger.info("MongoClient created for %s", settings.mongo_uri)
        return cls._client


@lru_cache(maxsize=1)
def get_database() -> Database:
    """Return the shared database handle."""
    return MongoConnection.client()[settings.mongo_db]


@lru_cache(maxsize=1)
def get_auth_database() -> Database:
    """Return database for auth/users, prefer default DB from URI."""
    client = MongoConnection.client()
    try:
        default_db = client.get_default_database()
    except Exception:
        default_db = None
    if default_db is not None:
        return default_db
    return client[settings.mongo_db]
