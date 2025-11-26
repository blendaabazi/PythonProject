from pydantic import Field, AliasChoices
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mongo_uri: str = Field(
        default="mongodb://localhost:27017",
        validation_alias=AliasChoices("MONGO_URI", "DATABASE_URL"),
    )
    mongo_db: str = Field(
        default="pricecompare",
        validation_alias=AliasChoices("MONGO_DB", "DATABASE_NAME"),
    )
    scrape_interval_min: int = Field(
        default=60,
        validation_alias=AliasChoices("SCRAPE_INTERVAL_MIN"),
    )

settings = Settings()
