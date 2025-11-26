import re
import requests
from bs4 import BeautifulSoup
from ..scraper_base import Scraper


def parse_price(text: str) -> float:
    """Extract numeric price from a messy string."""
    cleaned = re.sub(r"[^\d.,]", "", text)
    # Handle formats like "1.299,00" or "1299.00"
    if cleaned.count(",") == 1 and cleaned.count(".") >= 1:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    elif cleaned.count(",") == 1 and cleaned.count(".") == 0:
        cleaned = cleaned.replace(",", ".")
    else:
        cleaned = cleaned.replace(",", "").replace(".", "")
    return float(cleaned)


class NeptunKSScraper(Scraper):
    store = "Neptun KS"
    BASE_URL = "https://www.neptun-ks.com/smartphone.nspx?brands=987&page={page}&priceRange=709_2799"

    def fetch(self):
        headers = {"User-Agent": "Mozilla/5.0"}
        page = 1
        while True:
            url = self.BASE_URL.format(page=page)
            resp = requests.get(url, headers=headers, timeout=20)
            if resp.status_code >= 400:
                break
            soup = BeautifulSoup(resp.text, "lxml")
            cards = soup.select(".product-item, .product, .item")
            if not cards:
                break
            for card in cards:
                name_el = card.select_one(".product-name, .product-title, h3 a")
                price_el = card.select_one(".price, .product-price, .current-price")
                link_el = card.select_one("a")
                if not (name_el and price_el and link_el):
                    continue
                name = name_el.get_text(strip=True)
                if "iphone" not in name.lower():
                    continue
                try:
                    price = parse_price(price_el.get_text(" ", strip=True))
                except Exception:
                    continue
                href = link_el.get("href") or ""
                product_url = href if href.startswith("http") else f"https://www.neptun-ks.com{href}"
                sku = card.get("data-sku") or name
                yield {
                    "sku": sku,
                    "name": name,
                    "price": price,
                    "currency": "EUR",
                    "product_url": product_url,
                    "in_stock": True,
                }
            page += 1
