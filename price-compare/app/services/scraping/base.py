import abc
import logging
import re
import time
import unicodedata
from dataclasses import dataclass
from typing import Iterable, List, Protocol
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


class PriceParser(Protocol):
    def parse(self, text: str) -> float: ...


class EuPriceParser(PriceParser):
    """Parse EU/US formatted price strings to float."""

    def parse(self, text: str) -> float:
        return parse_price(text)


class UrlNormalizer(Protocol):
    def normalize(self, value: str | None, base: str) -> str | None: ...


class BasicUrlNormalizer(UrlNormalizer):
    def normalize(self, value: str | None, base: str) -> str | None:
        return normalize_url(value, base)


class BaseScraper(abc.ABC):
    """Template Method base class for scrapers with overridable hooks."""

    store: ShopName
    category: ProductCategory = ProductCategory.SMARTPHONE
    parser: str = "lxml"

    def __init__(
        self,
        price_parser: PriceParser | None = None,
        url_normalizer: UrlNormalizer | None = None,
    ) -> None:
        self.price_parser = price_parser or EuPriceParser()
        self.url_normalizer = url_normalizer or BasicUrlNormalizer()
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
                self.before_request(url)
                html = self._get(url)
            except Exception as exc:
                logger.warning("Skipping %s url=%s due to %s", self.store, url, exc)
                continue
            soup = BeautifulSoup(html, self.parser)
            items = []
            for item in self.parse_products(soup, url):
                if self.should_skip(item):
                    continue
                items.append(item)
            yield from self.after_parse(items)

    def before_request(self, url: str) -> None:
        """Hook to inject headers/auth before a request."""
        return None

    def should_skip(self, item: ScrapedItem) -> bool:
        """Hook to drop items (e.g., accessories)."""
        return False

    def after_parse(self, items: List[ScrapedItem]) -> Iterable[ScrapedItem]:
        """Hook to post-process parsed items."""
        return items

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
        resp = self._session.get(
            url,
            headers=headers,
            timeout=settings.scrape_timeout_sec,
            proxies={"http": None, "https": None},
        )
        resp.raise_for_status()
        return resp.text

    def target_urls(self) -> Iterable[str]:
        yield self.base_url()

    def parse_price(self, text: str) -> float:
        return self.price_parser.parse(text)

    def normalize_url(self, value: str | None, base: str) -> str | None:
        return self.url_normalizer.normalize(value, base)

    @abc.abstractmethod
    def base_url(self) -> str:
        ...

    @abc.abstractmethod
    def parse_products(self, soup: BeautifulSoup, url: str) -> Iterable[ScrapedItem]:
        ...


class PagedScraper(BaseScraper):
    """Scraper that walks multiple pages via page numbers."""

    max_pages: int = 1

    def target_urls(self) -> Iterable[str]:
        for page in range(1, self.max_pages + 1):
            yield self.base_url_for_page(page)

    @abc.abstractmethod
    def base_url_for_page(self, page: int) -> str:
        ...


class SinglePageScraper(BaseScraper):
    """Scraper focused on a single product/page."""

    def target_urls(self) -> Iterable[str]:
        yield self.base_url()


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
    "kellef",
    "mbrojt",
    "spigen",
    "glass",
    "xham",
    "ekran",
    "screen",
    "magsafe",
    "ultra hybrid",
    "clear",
    "protector",
]


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch)).lower()


def looks_like_accessory(name: str) -> bool:
    """Heuristic filter for cases/screen-protectors."""
    lower = normalize_text(name)
    return any(term in lower for term in ACCESSORY_KEYWORDS)
