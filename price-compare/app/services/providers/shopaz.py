import re
import requests
from bs4 import BeautifulSoup
from ..scraper_base import Scraper


def parse_price(text: str) -> float:
    cleaned = re.sub(r"[^\d.,]", "", text)
    if cleaned.count(",") == 1 and cleaned.count(".") >= 1:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    elif cleaned.count(",") == 1 and cleaned.count(".") == 0:
        cleaned = cleaned.replace(",", ".")
    else:
        cleaned = cleaned.replace(",", "").replace(".", "")
    return float(cleaned)


class ShopAzScraper(Scraper):
    store = "ShopAz"
    BASE_URL = "https://shopaz.com/al/category/elektronike/10?category-2=telefon---tablet&sort=release%3Adesc&brand=apple&page={page}"

    def fetch(self):
        headers = {"User-Agent": "Mozilla/5.0"}
        page = 1
        while True:
            url = self.BASE_URL.format(page=page)
            resp = requests.get(url, headers=headers, timeout=20)
            if resp.status_code >= 400:
                break
            soup = BeautifulSoup(resp.text, "lxml")
            cards = soup.select(".product-item, .product, .col")
            if not cards:
                break
            for card in cards:
                name_el = card.select_one(".product-name a, .title a, h3 a")
                price_el = card.select_one(".price, .product-price, .current-price")
                link_el = name_el if name_el else card.select_one("a")
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
                product_url = href if href.startswith("http") else f"https://shopaz.com{href}"
                sku = card.get("data-id") or name
                yield {
                    "sku": sku,
                    "name": name,
                    "price": price,
                    "currency": "EUR",
                    "product_url": product_url,
                    "in_stock": True,
                }
            page += 1
