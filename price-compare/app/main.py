import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.background import BackgroundScheduler
from .api import products, shops, prices, compare
from .api.error_handlers import register_exception_handlers
from .config import settings
from .database import ensure_indexes
from .dependencies import get_ingestion_service

logger = logging.getLogger(__name__)
STATIC_DIR = Path(__file__).resolve().parent / "static"

app = FastAPI(title="KS Price Compare")
register_exception_handlers(app)
app.include_router(products.router)
app.include_router(shops.router)
app.include_router(prices.router)
app.include_router(compare.router)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

scheduler = BackgroundScheduler()
scheduler.add_job(lambda: get_ingestion_service().run_all(), "interval", minutes=settings.scrape_interval_min)


@app.on_event("startup")
def startup():
    try:
        ensure_indexes()
        if settings.scrape_on_startup:
            get_ingestion_service().run_all()
        scheduler.start()
    except Exception as exc:
        logger.exception("Startup hook failed: %s", exc)


@app.on_event("shutdown")
def shutdown():
    scheduler.shutdown()


@app.get("/")
def root():
    index_file = STATIC_DIR / "index.html"
    return FileResponse(index_file)


@app.get("/health")
def health():
    return {"status": "ok"}
