# KS Price Compare (Service-Oriented FastAPI + MongoDB)

Technology product price comparison platform for Kosovo, designed for Advanced Programming coursework. The system emphasises layered/service-oriented architecture, extensibility of scrapers, data-intensive processing, and clear justification of design decisions.

## Quickstart
- Prereqs: Python 3.11+, MongoDB (local or Atlas), `pip install -r requirements.txt`.
- Env: copy `.env` and set `MONGO_URI`, `MONGO_DB`, optionally `SCRAPE_INTERVAL_MIN`, `SCRAPE_ON_STARTUP`.
- Run API: `uvicorn app.main:app --reload` (serves Swagger at `/docs` and UI at `/`).
- One-off ingest: `python scripts/manual_ingest.py` (uses the shared `IngestionService`).
- Tests: `pytest`.

## Architecture (Layered + Service-Oriented)
- **API layer (FastAPI routers)**: `app/api/*.py` owns request/response DTOs and error handling.
- **Application services**: `IngestionService`, `ComparisonService` orchestrate use cases without DB details.
- **Domain layer**: Entities and contracts (`app/domain/*`) with enums for shops/categories and repository interfaces.
- **Infrastructure**: Mongo adapters (`app/infrastructure/mongo/*`) implementing repositories + Singleton connection.
- **Scraping layer**: Template Method base + concrete scrapers per shop (`app/services/scraping/*`, `app/services/providers/*`).
- **Minimal frontend**: Static HTML consuming REST endpoints to demonstrate API usage.

### Component & Flow (text diagram)
```
[FastAPI Routers] --> [ComparisonService] --> [ProductRepository | PriceRepository] --> [MongoDB]
        |                ^
        |                |
        +--> [/compare] --+

[Scheduler/Manual CLI] -> [IngestionService] -> [ScraperFactory] -> [BaseScraper subclasses]
                                                -> [ShopRepository | ProductRepository | PriceRepository] -> [MongoDB]
```

## Design Patterns (with rationale)
- **Template Method** (`BaseScraper.fetch`): fixes crawl workflow (fetch HTML -> parse) while letting providers override URL generation and parsing; keeps robustness logic centralized.
- **Factory** (`ScraperFactory`): builds scraper instances per `ShopName` enum, enabling plug-and-play onboarding without touching ingestion logic.
- **Repository** (`Mongo*Repository`): decouples domain/services from Mongo schemas; eases testing with in-memory fakes.
- **Singleton** (`MongoConnection` + dependency caches): one Mongo client/DB instance shared across layers, avoiding redundant pools and ensuring consistent config.
- (DI via `dependencies.py`): cached providers keep high-level modules independent from concrete implementations (supports inversion).

## Data Model (MongoDB)
- `products`: `{_id, sku, name, category, brand}` (unique `sku`).
- `shops`: `{_id, code, name}`.
- `prices`: `{_id, product_id, store_id, product_sku, store_code, price, currency, product_url, in_stock, timestamp}` with indexes on `(product_sku, store_code, timestamp)`.
- Domain models (`Product`, `Shop`, `PricePoint`) remain DB-agnostic; API DTOs (`app/schemas`) decouple persistence from responses.

## API Surface
- `GET /products?q=` list/search products.
- `GET /products/{sku}` product detail.
- `GET /products/{sku}/prices` latest offers sorted by price.
- `GET /products/{sku}/history?limit=` recent price history.
- `GET /shops` registered shops.
- `GET /compare?sku=` (or `?q=` fallback) aggregated comparison with cheapest store.
- `GET /prices/cheapest?category=&limit=` cheapest offers by category.
- `GET /health` basic liveness.

## Scraping & Ethics
- Scrapers share UA headers, timeouts, and resilient parsing via the Template Method base.
- Pagination is bounded to avoid hammering sites; errors are caught per-scraper to keep pipeline alive.
- Ethical stance: respect site terms/robots where applicable, throttle requests, and avoid automating protected content; scraping remains fragile to markup changes and can require coordination with shops.

## Testing
- Unit tests cover price parsing/slug generation and comparison logic via in-memory repositories (`tests/`).
- Repositories and services are DI-friendly, enabling further mocks for API tests.

## Research & Justification (summary)
- Surveyed platforms: Idealo (EU), PriceSpy, Kelkoo; all rely on data ingestion pipelines, normalized product catalogs, and comparison endpoints—mirrored here with a lightweight SOA stack.
- Stack choices: FastAPI for async-friendly API surface, MongoDB for flexible product/price history, BeautifulSoup for deterministic parsing without heavy Selenium.
- Trade-offs: HTML scraping fragility vs. official APIs; Mongo’s schema flexibility vs. fewer joins; background scheduler vs. external orchestrators (e.g., Celery/Airflow) for scale.
- Future work: add message queue for ingestion, caching layer for hot comparisons, currency normalization, richer product schema (specs/brands), and CI with contract tests.

## Defending the Design
- **Why layered/SOA**: isolates responsibilities (ingestion vs. comparison vs. persistence) enabling independent evolution and testing.
- **Patterns**: each addresses a concrete pain point (extensible scrapers, DB swapability, single connection, fixed scrape workflow).
- **Data flow**: scrapers → ingestion service → repositories → Mongo → comparison service → API/Frontend.
- **Scalability path**: move scheduler to worker nodes, shard Mongo on `product_sku`, parallelize scrapers per shop, add rate-limits/caches in API.
