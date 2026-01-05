from ..scraping.base import BaseScraper, ScrapedItem, parse_price, slugify_name
from ...domain.enums import ShopName, ProductCategory


class TecStoreScraper(BaseScraper):
    """Placeholder scraper showing how to onboard a new provider."""

    store = ShopName.TECSTORE
    category = ProductCategory.LAPTOP

    def base_url(self) -> str:
        return "https://exampletecstore.com/laptops"  # TODO: replace with production URL

    def parse_products(self, soup, url):
        for card in soup.select(".product-card"):  # TODO: update selectors for real site
            name_el = card.select_one(".title")
            price_el = card.select_one(".price")
            link_el = card.select_one("a")
            if not (name_el and price_el and link_el):
                continue
            name = name_el.get_text(strip=True)
            try:
                price = parse_price(price_el.get_text(strip=True))
            except Exception:
                continue
            sku = slugify_name(name)
            link = link_el["href"]
            yield ScrapedItem(
                sku=sku,
                name=name,
                price=price,
                currency="EUR",
                product_url=link if link.startswith("http") else f"https://exampletecstore.com{link}",
                in_stock="out of stock" not in card.get_text(" ").lower(),
                brand=None,
            )
