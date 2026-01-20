import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.background import BackgroundScheduler
from .api import products, shops, prices, compare, auth
from .api.error_handlers import register_exception_handlers
from .config import settings
from .database import ensure_indexes
from .dependencies import get_ingestion_service

logger = logging.getLogger(__name__)
STATIC_DIR = Path(__file__).resolve().parent / "static"

scheduler = BackgroundScheduler()
scheduler.add_job(lambda: get_ingestion_service().run_all(), "interval", minutes=settings.scrape_interval_min)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        ensure_indexes()
        if settings.scrape_on_startup:
            get_ingestion_service().run_all()
        scheduler.start()
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Startup hook failed: %s", exc)
    try:
        yield
    finally:
        if scheduler.running:
            scheduler.shutdown()


app = FastAPI(title="KS Price Compare", lifespan=lifespan)
register_exception_handlers(app)
app.include_router(products.router)
app.include_router(shops.router)
app.include_router(prices.router)
app.include_router(compare.router)
app.include_router(auth.router)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def root():
    index_file = STATIC_DIR / "index.html"
    return FileResponse(index_file)


@app.get("/compare-ui")
def compare_ui():
    compare_file = STATIC_DIR / "compare.html"
    return FileResponse(compare_file)


@app.get("/auth-ui")
def auth_ui():
    auth_file = STATIC_DIR / "login.html"
    return FileResponse(auth_file)


@app.get("/login")
def login_ui():
    login_file = STATIC_DIR / "login.html"
    return FileResponse(login_file)


@app.get("/register")
def register_ui():
    register_file = STATIC_DIR / "register.html"
    return FileResponse(register_file)


@app.get("/health")
def health():
    return {"status": "ok"}
