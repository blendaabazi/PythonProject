import json
from bs4 import BeautifulSoup
from ..scraping.base import (
    PagedScraper,
    ScrapedItem,
    slugify_name,
    looks_like_accessory,
    dedupe_urls,
    extract_image_urls_from_tag,
)
from ...domain.enums import ShopName, ProductCategory


class AztechScraper(PagedScraper):
    store = ShopName.AZTECH
    category = ProductCategory.SMARTPHONE
    BASE_URL = (
        "https://aztechonline.com/categorysearch?category=&term=iphone"
        "&sort=created_at&order=desc&limit=80&page={page}"
    )
    max_pages = 5

    def base_url(self) -> str:
        return self.BASE_URL.format(page=1)

    def base_url_for_page(self, page: int) -> str:
        return self.BASE_URL.format(page=page)

    def _extract_images_from_payload(self, raw: str) -> list[str]:
        if not raw:
            return []
        urls: list[str] = []
        payload = None
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = None
        if isinstance(payload, list):
            urls = payload
        elif isinstance(payload, dict):
            urls = payload.get("images") or payload.get("gallery") or payload.get("pictures") or []
        else:
            urls = [item.strip() for item in raw.split(",") if item.strip()]
        normalized = [self.normalize_url(url, "https://aztechonline.com") for url in urls]
        return dedupe_urls([url for url in normalized if url])

    def _extract_gallery_images(self, product_url: str) -> list[str]:
        try:
            html = self._get(product_url)
        except Exception:
            return []
        soup = BeautifulSoup(html, self.parser)
        selectors = [
            ".image-additional img",
            ".thumbnails img",
            ".product-thumbs img",
            ".product-images img",
            ".product-gallery img",
            ".gallery img",
        ]
        for selector in selectors:
            imgs = soup.select(selector)
            if not imgs:
                continue
            urls: list[str] = []
            for img in imgs:
                urls.extend(extract_image_urls_from_tag(img, "https://aztechonline.com"))
            if urls:
                return dedupe_urls(urls)
        return []

    def _select_cards(self, soup) -> list:
        cards = soup.select(
            ".product-container, .product-layout, .product-thumb, .product-grid, .product-item, .product"
        )
        if cards:
            return list(cards)
        template = soup.find("script", {"id": "search-template"})
        if not template:
            return []
        template_html = template.get_text() or ""
        if not template_html.strip():
            return []
        template_soup = BeautifulSoup(template_html, self.parser)
        return list(
            template_soup.select(
                ".product-container, .product-layout, .product-thumb, .product-grid, .product-item, .product"
            )
        )

    def parse_products(self, soup, url):
        cards = self._select_cards(soup)
        for card in cards:
            name_el = card.select_one(
                ".title-container a, .caption a, .name a, h4 a, h3 a, .product-title a"
            )
            if not name_el:
                name_el = card.select_one("a[title]")
            link_el = name_el or card.select_one(".image-container a, a")
            price_el = card.select_one(
                ".title-container .product-price span, .product-price span, "
                ".price, .price-new, .product-price, .special-price, [data-price]"
            )
            if not (price_el and link_el):
                continue
            name = name_el.get_text(" ", strip=True) if name_el else ""
            if not name and link_el:
                name = link_el.get("title") or ""
            if not name:
                continue
            if "iphone" not in name.lower() or looks_like_accessory(name):
                continue
            try:
                price_text = price_el.get_text(" ", strip=True)
                if not price_text and price_el.has_attr("data-price"):
                    price_text = str(price_el.get("data-price"))
                price = self.parse_price(price_text)
            except Exception:
                continue
            href = link_el.get("href") or ""
            product_url = self.normalize_url(href, "https://aztechonline.com") or href
            image_urls: list[str] = []
            img_el = card.select_one("img, source")
            image_urls.extend(extract_image_urls_from_tag(img_el, "https://aztechonline.com"))
            for attr_name in (
                "data-images",
                "data-gallery",
                "data-pictures",
                "data-thumbs",
                "data-product",
                "data-item",
            ):
                raw = card.get(attr_name)
                if raw:
                    image_urls.extend(self._extract_images_from_payload(raw))
            if not image_urls and product_url:
                image_urls = self._extract_gallery_images(product_url)
            image_urls = dedupe_urls([url for url in image_urls if url])
            image_url = image_urls[0] if image_urls else None
            sku = slugify_name(name)
            no_stock_el = card.select_one(".no-stock, .out-of-stock, .sold-out")
            no_stock = False
            if no_stock_el:
                text = no_stock_el.get_text(" ", strip=True).lower()
                style = (no_stock_el.get("style") or "").lower()
                hidden = no_stock_el.has_attr("hidden") or no_stock_el.get("aria-hidden") == "true"
                no_stock = bool(text) and "display: none" not in style and not hidden
            in_stock = not no_stock
            yield ScrapedItem(
                sku=sku,
                name=name,
                price=price,
                currency="EUR",
                product_url=product_url,
                in_stock=in_stock,
                brand="Apple",
                image_url=image_url,
                image_urls=image_urls or None,
            )
