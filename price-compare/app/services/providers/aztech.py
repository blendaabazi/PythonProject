from ..scraping.base import (
    PagedScraper,
    ScrapedItem,
    slugify_name,
    looks_like_accessory,
)
from ...domain.enums import ShopName, ProductCategory


class AztechScraper(PagedScraper):
    store = ShopName.AZTECH
    category = ProductCategory.SMARTPHONE
    BASE_URL = "https://aztechonline.com/telefon-tablete?limit=20&Brendi_Telelefona=17178&page={page}"
    max_pages = 5

    def base_url(self) -> str:
        return self.BASE_URL.format(page=1)

    def base_url_for_page(self, page: int) -> str:
        return self.BASE_URL.format(page=page)

    def parse_products(self, soup, url):
        cards = soup.select(".product-layout, .product-grid, .product-item")
        for card in cards:
            name_el = card.select_one(".caption a, .name a, h4 a")
            price_el = card.select_one(".price, .price-new, .product-price")
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
            product_url = href if href.startswith("http") else f"https://aztechonline.com{href}"
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
            image_url = self.normalize_url(img_src, "https://aztechonline.com")
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
