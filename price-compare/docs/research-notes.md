# Research & Defense Notes

These notes expand the justification for architecture and design choices for a Master-level defense. They can be transformed into a 6–8 page report.

## Market Survey (Condensed)
- **Idealo / PriceSpy / Kelkoo**: aggregator pattern with strong product normalization, historical price graphs, and alerting; data sourced via feeds + scraping. Emphasises canonical SKUs and store reputation—mirrored via `sku` unique index and `Shop` entity.
- **Google Shopping**: prioritises merchant feeds and policy compliance; highlights legal/ethical constraints and importance of structured data.
- **Regional apps (Balkan)**: many rely on manual updates or limited automation, showing opportunity for a modular ingestion pipeline.

## Architectural Rationale
- **Layered + SOA** chosen to isolate volatility: scraping logic changes frequently, whereas domain logic (comparison) should remain stable. Routers depend on services and repositories via interfaces (dependency inversion).
- **Data-intensive focus**: Mongo stores time-series price points; repositories expose history queries and cheapest-by-category aggregation. The design anticipates growth by indexing `(product_sku, store_code, timestamp)` and separating read models (DTOs) from domain entities.
- **Extensibility**: `ScraperFactory` + `BaseScraper` Template Method allow onboarding a new shop by adding one provider class and registering it, without modifying ingestion or services.
- **Service orientation**: ingestion and comparison are orchestrated as services that can run independently (HTTP workers vs. scheduler worker).

## Design Patterns Justification
- **Template Method**: Stabilises scraper workflow (request → parse → yield). Prevents code duplication for headers/timeouts/error handling and surfaces a clear override surface (URLs + parsing).
- **Factory**: Encapsulates scraper creation keyed by `ShopName` enum; prevents switch/case logic scattered across the app.
- **Repository**: Abstracts persistence; Mongo adapters implement contracts while tests use in-memory fakes. Facilitates swapping to PostgreSQL/Neo4j without touching services.
- **Singleton**: Mongo client & dependency caches avoid multiple TCP pools and ensure consistent configuration across API, scheduler, and scripts.
- **(DI Strategy)**: Dependencies are cached providers; could be extended to runtime selection of pricing strategies (e.g., currency normalization or discount application).

## Data Model & Aggregations
- **Products**: canonical `sku`, name, category, brand.
- **Shops**: stable `code`, human-friendly `name`.
- **Prices**: immutable observations with timestamps, `product_sku` and `store_code` for easy grouping. Aggregations: latest price per store, history slices, cheapest per category.
- **Reasoning**: denormalised keys reduce joins for read-heavy comparison endpoints; indexes keep history queries bounded.

## Ethical & Legal Considerations
- Scraping must respect robots.txt/ToS, use conservative pagination, and identify user-agent; fragility to DOM changes is acknowledged.
- For production, shops should be engaged for official feeds or APIs; rate limiting and consent logging should be added.
- Data privacy minimal (no PII), but availability risks (blocking/IP bans) justify rotating proxies or request backoff.

## Limitations & Future Work
- **Current**: No headless browser for heavy JS sites; no currency normalization; scheduler is in-process; error handling is coarse-grained.
- **Planned**: move ingestion to a worker pool (Celery/RQ/Airflow), add retry/backoff policies, enrich product schema (specs/brands) for better matching, add alerting/notifications, and incorporate caching (Redis) for hot comparison results.
- **Testing**: expand to contract tests for each scraper with saved HTML fixtures; add API integration tests and load testing scripts.

## Data Flow Summary
```
Scraper (Template Method) -> ScrapedItem -> IngestionService
  -> ProductRepository.upsert / ShopRepository.upsert
  -> PriceRepository.add_price (immutable time-series)
  -> MongoDB (indexed collections)
Compare endpoint -> ComparisonService -> PriceRepository.latest_for_product -> API DTOs -> Frontend
```

## Defense Talking Points
- Why MongoDB: flexible schema for evolving product attributes + cheap historical writes; indexes mitigate query cost.
- Why FastAPI: async-capable, Pydantic DTOs for strict API boundaries, automatic docs for teaching/defense.
- Risk mitigation: decoupled layers, plug-and-play scrapers, explicit configuration via `.env`, and Singleton DB client.
