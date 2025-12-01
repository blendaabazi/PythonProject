import re
import requests
from bs4 import BeautifulSoup
from ..scraper_base import Scraper, slugify_name


def parse_price(text: str) -> float:
    """Extract numeric price from formatted text like '1.299,00 EUR'."""
    cleaned = re.sub(r"[^\d.,]", "", text)
    if cleaned.count(',') == 1 and cleaned.count('.') >= 1:
        cleaned = cleaned.replace('.', '').replace(',', '.')
    elif cleaned.count(',') == 1 and cleaned.count('.') == 0:
        cleaned = cleaned.replace(',', '.')
    else:
        cleaned = cleaned.replace(',', '').replace('.', '')
    return float(cleaned)


class GjirafaMallIphone16Scraper(Scraper):
    """Scrape the specific iPhone 15 128GB Black product page."""

    store = "GjirafaMall"
    PRODUCT_URL = "https://gjirafamall.com/apple-iphone-15-128gb-black"

    def fetch(self):
        headers = {"User-Agent": "Mozilla/5.0"}
        resp = requests.get(self.PRODUCT_URL, headers=headers, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        container = soup.select_one(
            "#product-details-form > div:nth-child(2) > section.product-essential.bg-white.shadow-md.md\\:shadow-none.md\\:border.rounded.p-2.md\\:p-6.mb-6"
        )
        name_el = container.select_one(
            "div.overview.product-details h1"
        ) if container else soup.select_one("h1")
        price_el = soup.select_one("#price-value-412256") or (
            container.select_one(".actual-price, .price, .product-price") if container else soup.select_one(".actual-price, .price, .product-price")
        )
        if not (name_el and price_el):
            return
        name = name_el.get_text(strip=True)
        price = parse_price(price_el.get_text(" ", strip=True))
        sku = slugify_name(name)
        yield {
            "sku": sku,
            "name": name,
            "price": price,
            "currency": "EUR",
            "product_url": self.PRODUCT_URL,
            "in_stock": True,
        }
