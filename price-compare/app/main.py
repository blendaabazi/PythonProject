import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.background import BackgroundScheduler
from .api import products, shops, prices, compare, auth
from .api.error_handlers import register_exception_handlers
from .config import settings
from .database import ensure_indexes
from .dependencies import get_ingestion_service

logger = logging.getLogger(__name__)
STATIC_DIR = Path(__file__).resolve().parent / "static"


def render_page(
    title: str,
    script_src: str,
    *,
    include_header: bool = True,
    body_class: str | None = None,
    stylesheet: str = "/static/styles.css",
) -> HTMLResponse:
    """Return a minimal HTML shell without relying on static HTML files."""
    body_lines: list[str] = []
    if include_header:
        body_lines.extend(
            [
                '  <div id="siteHeader"></div>',
                '  <script src="/static/header.js"></script>',
            ]
        )
    body_lines.append('  <div id="app"></div>')
    body_lines.append(f'  <script src="{script_src}"></script>')
    body_html = "\n".join(body_lines)
    body_class_attr = f' class="{body_class}"' if body_class else ""
    html = (
        "<!DOCTYPE html>\n"
        '<html lang="en">\n'
        "<head>\n"
        '  <meta charset="UTF-8" />\n'
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n'
        f"  <title>{title}</title>\n"
        f'  <link rel="stylesheet" href="{stylesheet}" />\n'
        "</head>\n"
        f"<body{body_class_attr}>\n"
        f"{body_html}\n"
        "</body>\n"
        "</html>\n"
    )
    return HTMLResponse(html)

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
    return render_page("Apple Price Compare KS", "/static/pages/index.js")


@app.get("/compare-ui")
def compare_ui():
    return render_page("KS Price Compare - Gjirafa vs Neptun", "/static/pages/compare.js")


@app.get("/auth-ui")
def auth_ui():
    return render_page(
        "Login | KS Price Compare",
        "/static/pages/login.js",
        include_header=False,
        body_class="auth-body",
        stylesheet="/static/styles.css?v=2",
    )


@app.get("/login")
def login_ui():
    return render_page(
        "Login | KS Price Compare",
        "/static/pages/login.js",
        include_header=False,
        body_class="auth-body",
        stylesheet="/static/styles.css?v=2",
    )


@app.get("/register")
def register_ui():
    return render_page(
        "Register | KS Price Compare",
        "/static/pages/register.js",
        include_header=False,
        body_class="auth-body",
        stylesheet="/static/styles.css?v=2",
    )


@app.get("/saved")
def saved_ui():
    return render_page("Saved Products | KS Price Compare", "/static/pages/saved.js")


@app.get("/profile")
def profile_ui():
    return render_page("My Profile | KS Price Compare", "/static/pages/profile.js")


@app.get("/dashboard")
def dashboard_ui():
    return render_page("Admin Dashboard | KS Price Compare", "/static/pages/dashboard.js")


@app.get("/health")
def health():
    return {"status": "ok"}
