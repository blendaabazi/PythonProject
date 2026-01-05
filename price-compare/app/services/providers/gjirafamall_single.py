from ..scraping.base import BaseScraper, ScrapedItem, parse_price, slugify_name, looks_like_accessory
from ...domain.enums import ShopName, ProductCategory


class GjirafaMallIphone16Scraper(BaseScraper):
    """Scrape the specific iPhone 15 128GB Black product page."""

    store = ShopName.GJIRAFAMALL
    category = ProductCategory.SMARTPHONE
    PRODUCT_URL = "https://gjirafamall.com/apple-iphone-15-128gb-black"

    def base_url(self) -> str:
        return self.PRODUCT_URL

    def parse_products(self, soup, url):
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
            return []
        name = name_el.get_text(strip=True)
        if looks_like_accessory(name):
            return []
        price = parse_price(price_el.get_text(" ", strip=True))
        sku = slugify_name(name)
        yield ScrapedItem(
            sku=sku,
            name=name,
            price=price,
            currency="EUR",
            product_url=self.PRODUCT_URL,
            in_stock=True,
            brand="Apple",
        )
