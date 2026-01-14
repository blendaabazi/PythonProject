from bs4 import BeautifulSoup

from app.services.providers.shopaz import ShopAzScraper


def test_shopaz_scraper_parses_minimal_card():
    html = """
    <div class="product-item" data-product-card>
      <h3 class="product-name"><a href="/al/product/iphone-99-pro-max">Apple iPhone 99 Pro Max 256GB</a></h3>
      <span class="text-xl font-semibold">1,199.50 €</span>
      <img src="/images/iphone-99.jpg" data-src="//cdn.shopaz.com/img/iphone-99.png" />
    </div>
    """
    soup = BeautifulSoup(html, "lxml")
    scraper = ShopAzScraper()

    items = list(scraper.parse_products(soup, url="https://shopaz.com"))

    assert len(items) == 1
    item = items[0]
    assert item.sku == "apple-iphone-99-pro-max-256gb"
    assert item.price == 1199.50
    assert item.product_url.endswith("/al/product/iphone-99-pro-max")
    assert item.image_url.startswith("https://")
