import abc
import logging
import re
import time
from dataclasses import dataclass
from typing import Iterable
import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from ...config import settings
from ...domain.enums import ShopName, ProductCategory

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class ScrapedItem:
    sku: str
    name: str
    price: float
    currency: str
    product_url: str
    in_stock: bool
    brand: str | None = None
    image_url: str | None = None
    image_urls: list[str] | None = None


class BaseScraper(abc.ABC):
    """Template Method base class for scrapers.

    The fetch() method defines the invariant algorithm:
        - iterate target URLs
        - download HTML
        - parse into ScrapedItem instances
    Subclasses customize target_urls() and parse_products().
    """

    store: ShopName
    category: ProductCategory = ProductCategory.SMARTPHONE
    parser: str = "lxml"

    def __init__(self) -> None:
        self._session = requests.Session()
        retries = Retry(
            total=settings.scrape_retries,
            connect=settings.scrape_retries,
            read=settings.scrape_retries,
            status=settings.scrape_retries,
            backoff_factor=settings.scrape_backoff_sec,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=("GET",),
            raise_on_status=False,
        )
        adapter = HTTPAdapter(max_retries=retries)
        self._session.mount("http://", adapter)
        self._session.mount("https://", adapter)
        self._last_request_ts = 0.0

    def fetch(self) -> Iterable[ScrapedItem]:
        for url in self.target_urls():
            try:
                html = self._get(url)
            except Exception as exc:
                logger.warning("Skipping %s url=%s due to %s", self.store, url, exc)
                continue
            soup = BeautifulSoup(html, self.parser)
            for item in self.parse_products(soup, url):
                yield item

    def _throttle(self) -> None:
        delay = settings.scrape_delay_sec
        if delay <= 0:
            return
        now = time.monotonic()
        sleep_for = delay - (now - self._last_request_ts)
        if sleep_for > 0:
            time.sleep(sleep_for)
        self._last_request_ts = time.monotonic()

    def _get(self, url: str) -> str:
        self._throttle()
        headers = {"User-Agent": "Mozilla/5.0"}
        # Explicitly ignore system proxies to avoid blocked corporate proxy defaults.
        resp = self._session.get(
            url,
            headers=headers,
            timeout=settings.scrape_timeout_sec,
            proxies={"http": None, "https": None},
        )
        resp.raise_for_status()
        return resp.text

    def target_urls(self) -> Iterable[str]:
        """Override to provide paging/URL generation."""
        yield self.base_url()

    @abc.abstractmethod
    def base_url(self) -> str:
        """Return base page URL (used by default target_urls)."""

    @abc.abstractmethod
    def parse_products(self, soup: BeautifulSoup, url: str) -> Iterable[ScrapedItem]:
        """Yield ScrapedItem instances from the parsed HTML."""


def parse_price(text: str) -> float:
    """Normalize messy price strings to a float.

    Handles:
    - "1.799,50" (EU thousands dot, decimal comma)
    - "1,799.50" (US thousands comma, decimal dot)
    - "1799,50" (decimal comma)
    - "1799.50" / "1799" (decimal dot / integer)
    """
    cleaned = re.sub(r"[^\d.,]", "", text)

    has_comma = "," in cleaned
    has_dot = "." in cleaned

    if has_comma and has_dot:
        # Decide style by last separator: if comma last -> EU, if dot last -> US.
        last_comma = cleaned.rfind(",")
        last_dot = cleaned.rfind(".")
        if last_comma > last_dot:
            # EU style: 1.799,50 -> remove thousands dots, use comma as decimal
            normalized = cleaned.replace(".", "").replace(",", ".")
        else:
            # US style: 1,799.50 -> remove thousands commas, keep dot decimal
            normalized = cleaned.replace(",", "")
    elif has_comma:
        # Only comma present; treat as decimal separator
        normalized = cleaned.replace(",", ".")
    else:
        # Only dots or plain digits; strip thousands dots if any
        parts = cleaned.split(".")
        if len(parts) > 2:
            normalized = "".join(parts[:-1]) + "." + parts[-1]
        else:
            normalized = cleaned

    return float(normalized)


def normalize_url(value: str | None, base: str) -> str | None:
    if not value:
        return None
    url = str(value).strip()
    if not url:
        return None
    if url.startswith(("http://", "https://")):
        return url
    if url.startswith("//"):
        return f"https:{url}"
    return f"{base.rstrip('/')}/{url.lstrip('/')}"


def dedupe_urls(urls: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    unique: list[str] = []
    for url in urls:
        if not url or url in seen:
            continue
        seen.add(url)
        unique.append(url)
    return unique


def extract_image_urls_from_tag(tag, base: str) -> list[str]:
    if tag is None:
        return []
    values: list[str] = []
    for attr in ("data-src", "data-original", "data-lazy", "src", "ng-src", "data-ng-src"):
        val = tag.get(attr)
        if val:
            values.append(val)
    for attr in ("srcset", "data-srcset"):
        val = tag.get(attr)
        if not val:
            continue
        for item in val.split(","):
            url = item.strip().split(" ")[0]
            if url:
                values.append(url)
    normalized = [normalize_url(url, base) for url in values]
    return dedupe_urls([url for url in normalized if url])


def slugify_name(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower())
    return slug.strip("-")


ACCESSORY_KEYWORDS = [
    "case",
    "cover",
    "kallf",
    "kellf",
    "mbrojt",
    "spigen",
    "glass",
    "xham",
    "magsafe",
    "ultra hybrid",
    "clear",
    "protector",
]


def looks_like_accessory(name: str) -> bool:
    """Heuristic filter for cases/screen-protectors."""
    lower = name.lower()
    return any(term in lower for term in ACCESSORY_KEYWORDS)
