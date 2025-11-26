import requests
from bs4 import BeautifulSoup
from ..scraper_base import Scraper

class TecStoreScraper(Scraper):
    store = "TecStore"

    def fetch(self):
        url = "https://exampletecstore.com/laptops"  # TODO: set real URL
        html = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"}).text
        soup = BeautifulSoup(html, "lxml")
        for card in soup.select(".product-card"):  # TODO: update selectors
            name = card.select_one(".title").get_text(strip=True)
            price_raw = card.select_one(".price").get_text(strip=True)
            price = float(price_raw.replace("€", "").replace(",", "").strip())
            sku = card.get("data-sku") or name
            link = card.select_one("a")["href"]
            yield {
                "sku": sku,
                "name": name,
                "price": price,
                "currency": "EUR",
                "product_url": link if link.startswith("http") else f"https://exampletecstore.com{link}",
                "in_stock": "out of stock" not in card.get_text(" ").lower(),
            }
