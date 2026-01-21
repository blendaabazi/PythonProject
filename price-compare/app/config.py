import os
from pydantic import Field, AliasChoices
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=os.getenv("ENV_FILE", ".env"), extra="ignore")

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
    scrape_on_startup: bool = Field(
        default=True,
        validation_alias=AliasChoices("SCRAPE_ON_STARTUP"),
    )
    scrape_timeout_sec: int = Field(
        default=20,
        validation_alias=AliasChoices("SCRAPE_TIMEOUT_SEC"),
    )
    scrape_retries: int = Field(
        default=2,
        validation_alias=AliasChoices("SCRAPE_RETRIES"),
    )
    scrape_backoff_sec: float = Field(
        default=0.5,
        validation_alias=AliasChoices("SCRAPE_BACKOFF_SEC"),
    )
    scrape_delay_sec: float = Field(
        default=0.0,
        validation_alias=AliasChoices("SCRAPE_DELAY_SEC"),
    )
    auth_password_iterations: int = Field(
        default=120000,
        validation_alias=AliasChoices("AUTH_PASSWORD_ITERATIONS"),
    )
    app_base_url: str = Field(
        default="",
        validation_alias=AliasChoices("APP_BASE_URL"),
    )
    smtp_host: str = Field(
        default="",
        validation_alias=AliasChoices("SMTP_HOST"),
    )
    smtp_port: int = Field(
        default=587,
        validation_alias=AliasChoices("SMTP_PORT"),
    )
    smtp_user: str = Field(
        default="",
        validation_alias=AliasChoices("SMTP_USER"),
    )
    smtp_password: str = Field(
        default="",
        validation_alias=AliasChoices("SMTP_PASSWORD"),
    )
    smtp_from: str = Field(
        default="",
        validation_alias=AliasChoices("SMTP_FROM"),
    )
    smtp_use_tls: bool = Field(
        default=True,
        validation_alias=AliasChoices("SMTP_USE_TLS"),
    )
    smtp_use_ssl: bool = Field(
        default=False,
        validation_alias=AliasChoices("SMTP_USE_SSL"),
    )
    smtp_timeout_sec: int = Field(
        default=10,
        validation_alias=AliasChoices("SMTP_TIMEOUT_SEC"),
    )

settings = Settings()
