import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.background import BackgroundScheduler
from .api import products
from .services.ingest import run_all
from .config import settings
from .database import ensure_indexes

logger = logging.getLogger(__name__)
STATIC_DIR = Path(__file__).resolve().parent / "static"

app = FastAPI(title="KS Price Compare")
app.include_router(products.router)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

scheduler = BackgroundScheduler()
scheduler.add_job(run_all, "interval", minutes=settings.scrape_interval_min)
scheduler.start()

@app.on_event("startup")
def startup():
    try:
        ensure_indexes()
    except Exception as exc:
        logger.exception("Skipping index creation: %s", exc)

@app.on_event("shutdown")
def shutdown():
    scheduler.shutdown()

@app.get("/")
def root():
    index_file = STATIC_DIR / "index.html"
    return FileResponse(index_file)

@app.get("/hello")
def hello():
    return {"message": "hello"}
