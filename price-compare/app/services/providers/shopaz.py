from ..scraping.base import BaseScraper, ScrapedItem, parse_price, slugify_name, looks_like_accessory, normalize_url
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

    def parse_products(self, soup, url):
        cards = soup.select(".product-item, .product, .col")
        for card in cards:
            name_el = card.select_one(".product-name a, .title a, h3 a")
            price_el = card.select_one(".price, .product-price, .current-price")
            link_el = name_el if name_el else card.select_one("a")
            if not (name_el and price_el and link_el):
                continue
            name = name_el.get_text(strip=True)
            if "iphone" not in name.lower() or looks_like_accessory(name):
                continue
            try:
                price = parse_price(price_el.get_text(" ", strip=True))
            except Exception:
                continue
            href = link_el.get("href") or ""
            product_url = href if href.startswith("http") else f"https://shopaz.com{href}"
            img_el = card.select_one("img")
            img_src = ""
            if img_el:
                img_src = (
                    img_el.get("data-src")
                    or img_el.get("data-original")
                    or img_el.get("data-lazy")
                    or img_el.get("src")
                    or ""
                )
                if not img_src:
                    srcset = img_el.get("srcset") or img_el.get("data-srcset") or ""
                    img_src = srcset.split(",")[0].strip().split(" ")[0] if srcset else ""
            image_url = normalize_url(img_src, "https://shopaz.com")
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
            )
