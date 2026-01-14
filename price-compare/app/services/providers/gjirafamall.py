import json
from bs4 import BeautifulSoup
from ..scraping.base import (
    PagedScraper,
    ScrapedItem,
    slugify_name,
    looks_like_accessory,
    extract_image_urls_from_tag,
    dedupe_urls,
)
from ...domain.enums import ShopName, ProductCategory


class GjirafaMallScraper(PagedScraper):
    store = ShopName.GJIRAFAMALL
    category = ProductCategory.SMARTPHONE
    BASE_URL = "https://gjirafamall.com/celular-teknologji?pagenumber={page}&orderby=&hls=false&is=false&hd=false"
    max_pages = 5

    def base_url(self) -> str:
        return self.BASE_URL.format(page=1)

    def base_url_for_page(self, page: int) -> str:
        return self.BASE_URL.format(page=page)

    def _extract_gallery_images(self, product_url: str) -> list[str]:
        try:
            html = self._get(product_url)
        except Exception:
            return []
        soup = BeautifulSoup(html, self.parser)
        selectors = [
            ".picture-thumbs img",
            ".product-thumbs img",
            ".product-gallery img",
            ".gallery-thumbs img",
            ".product-essential img",
        ]
        for selector in selectors:
            imgs = soup.select(selector)
            if not imgs:
                continue
            urls: list[str] = []
            for img in imgs:
                urls.extend(extract_image_urls_from_tag(img, "https://gjirafamall.com"))
            if urls:
                return dedupe_urls(urls)
        return []

    def parse_products(self, soup, url):
        cards = soup.select(".product-item, .item-box, .product")
        for card in cards:
            name_el = card.select_one(".product-title a, .product-name a, h2 a")
            price_el = card.select_one(".actual-price, .price, .product-price")
            link_el = name_el if name_el else card.select_one("a")
            if not (name_el and price_el and link_el):
                continue
            name = name_el.get_text(strip=True)
            if "iphone" not in name.lower() or looks_like_accessory(name):
                continue
            try:
                price = self.parse_price(price_el.get_text(" ", strip=True))
            except Exception:
                continue
            href = link_el.get("href") or ""
            product_url = href if href.startswith("http") else f"https://gjirafamall.com{href}"
            image_urls: list[str] = []
            img_el = card.select_one("img")
            image_urls.extend(extract_image_urls_from_tag(img_el, "https://gjirafamall.com"))
            for attr_name in ("data-images", "data-gallery", "data-pictures", "data-thumbs"):
                raw = card.get(attr_name)
                if not raw:
                    continue
                urls: list[str] = []
                try:
                    payload = json.loads(raw)
                    if isinstance(payload, list):
                        urls = payload
                    elif isinstance(payload, dict):
                        urls = payload.get("images") or payload.get("gallery") or []
                except json.JSONDecodeError:
                    urls = [item.strip() for item in raw.split(",") if item.strip()]
                for img_url in urls:
                    normalized = self.normalize_url(img_url, "https://gjirafamall.com")
                    if normalized:
                        image_urls.append(normalized)
            if not image_urls:
                image_urls = self._extract_gallery_images(product_url)
            image_urls = dedupe_urls(image_urls)
            image_url = image_urls[0] if image_urls else None
            sku = slugify_name(name)
            yield ScrapedItem(
                sku=sku,
                name=name,
                price=price,
                currency="EUR",
                product_url=product_url,
                in_stock=True,
                brand="Apple",
                image_url=image_url,
                image_urls=image_urls or None,
            )
