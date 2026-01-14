from bs4 import BeautifulSoup
from ..scraping.base import (
    BaseScraper,
    ScrapedItem,
    parse_price,
    slugify_name,
    looks_like_accessory,
    normalize_url,
    dedupe_urls,
    extract_image_urls_from_tag,
)
from ...domain.enums import ShopName, ProductCategory


class ShopAzScraper(BaseScraper):
    store = ShopName.SHOPAZ
    category = ProductCategory.SMARTPHONE
    BASE_URL = "https://shopaz.com/al/category/elektronike/10?category-2=telefon---tablet&sort=release%3Adesc&brand=apple&page={page}"
    max_pages = 4

    def base_url(self) -> str:
        return self.BASE_URL.format(page=1)

    def target_urls(self):
        for page in range(1, self.max_pages + 1):
            yield self.BASE_URL.format(page=page)

    def parse_products(self, soup: BeautifulSoup, url: str):
        cards = soup.select(
            "[data-product-card], .product-item, .product, .col, div.main-content div.flex.relative div.w-full.flex.flex-col.items-center > div"
        )
        for card in cards:
            name_el = card.select_one(".product-name a, .title a, h3 a, a[title]")
            if not name_el:
                name_el = card.select_one("h3, a")
            link_el = name_el if name_el else card.select_one("a")
            price_el = card.select_one("span.text-xl, .text-xl.font-semibold, .price, .product-price, .current-price, [data-price]")
            if not (name_el and link_el and price_el):
                continue
            name = name_el.get_text(" ", strip=True)
            if "iphone" not in name.lower() or looks_like_accessory(name):
                continue
            try:
                price = parse_price(price_el.get_text(" ", strip=True))
            except Exception:
                continue

            href = link_el.get("href") or ""
            product_url = href if href.startswith("http") else f"https://shopaz.com{href}"

            image_urls: list[str] = []
            img_el = card.select_one("img, source")
            image_urls.extend(extract_image_urls_from_tag(img_el, "https://shopaz.com"))
            if img_el:
                for attr in ("data-src", "data-original", "data-lazy", "data-img", "ng-src", "data-ng-src"):
                    val = img_el.get(attr)
                    if val:
                        normalized = normalize_url(val, "https://shopaz.com")
                        if normalized:
                            image_urls.append(normalized)
                srcset = img_el.get("srcset") or img_el.get("data-srcset") or ""
                if srcset and not image_urls:
                    first = srcset.split(",")[0].strip().split(" ")[0]
                    normalized = normalize_url(first, "https://shopaz.com")
                    if normalized:
                        image_urls.append(normalized)
            image_urls = dedupe_urls([u for u in image_urls if u])
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
