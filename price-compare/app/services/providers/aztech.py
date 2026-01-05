from ..scraping.base import BaseScraper, ScrapedItem, parse_price, slugify_name, looks_like_accessory
from ...domain.enums import ShopName, ProductCategory


class AztechScraper(BaseScraper):
    store = ShopName.AZTECH
    category = ProductCategory.SMARTPHONE
    BASE_URL = "https://aztechonline.com/telefon-tablete?limit=20&Brendi_Telelefona=17178&page={page}"
    max_pages = 5

    def base_url(self) -> str:
        return self.BASE_URL.format(page=1)

    def target_urls(self):
        for page in range(1, self.max_pages + 1):
            yield self.BASE_URL.format(page=page)

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
                price = parse_price(price_el.get_text(" ", strip=True))
            except Exception:
                continue
            href = link_el.get("href") or ""
            product_url = href if href.startswith("http") else f"https://aztechonline.com{href}"
            sku = slugify_name(name)
            yield ScrapedItem(
                sku=sku,
                name=name,
                price=price,
                currency="EUR",
                product_url=product_url,
                in_stock=True,
                brand="Apple",
            )
