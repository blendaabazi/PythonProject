from bs4 import BeautifulSoup

from app.services.providers.aztech import AztechScraper
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


def test_aztech_scraper_parses_minimal_card():
    html = """
    <div class="product-container">
      <div class="shared-product-card">
        <div class="image-container">
          <a href="https://aztechonline.com/apple-iphone-17-pro" title="Apple iPhone 17 Pro">
            <img src="https://aztechonline.com/cache/large/product/123/iphone.jpg" />
          </a>
        </div>
        <div class="title-container">
          <a href="https://aztechonline.com/apple-iphone-17-pro" title="Apple iPhone 17 Pro">
            <span>Apple iPhone 17 Pro</span>
          </a>
          <div class="product-price">
            <div class="product-price"><span>1,699.00 EUR</span></div>
          </div>
        </div>
      </div>
    </div>
    """
    soup = BeautifulSoup(html, "lxml")
    scraper = AztechScraper()

    items = list(scraper.parse_products(soup, url="https://aztechonline.com"))

    assert len(items) == 1
    item = items[0]
    assert item.sku == "apple-iphone-17-pro"
    assert item.price == 1699.00
    assert item.product_url.endswith("/apple-iphone-17-pro")
    assert item.image_url.startswith("https://")


def test_aztech_scraper_flags_no_stock_only_when_visible():
    html = """
    <div class="product-container">
      <div class="shared-product-card">
        <div class="image-container">
          <a href="https://aztechonline.com/apple-iphone-17-pro-max">
            <img src="https://aztechonline.com/cache/large/product/123/iphone.jpg" />
          </a>
          <a class="no-stock"><span>Nuk ka stok</span></a>
        </div>
        <div class="title-container">
          <a href="https://aztechonline.com/apple-iphone-17-pro-max">
            <span>Apple iPhone 17 Pro Max</span>
          </a>
          <div class="product-price"><span>€1,999.00</span></div>
        </div>
      </div>
    </div>
    """
    soup = BeautifulSoup(html, "lxml")
    scraper = AztechScraper()

    items = list(scraper.parse_products(soup, url="https://aztechonline.com"))

    assert len(items) == 1
    assert items[0].in_stock is False

    html_hidden = """
    <div class="product-container">
      <div class="shared-product-card">
        <div class="image-container">
          <a href="https://aztechonline.com/apple-iphone-17-pro-max">
            <img src="https://aztechonline.com/cache/large/product/123/iphone.jpg" />
          </a>
          <a class="no-stock" style="display: none"><span>Nuk ka stok</span></a>
        </div>
        <div class="title-container">
          <a href="https://aztechonline.com/apple-iphone-17-pro-max">
            <span>Apple iPhone 17 Pro Max</span>
          </a>
          <div class="product-price"><span>€1,999.00</span></div>
        </div>
      </div>
    </div>
    """
    soup_hidden = BeautifulSoup(html_hidden, "lxml")
    items_hidden = list(scraper.parse_products(soup_hidden, url="https://aztechonline.com"))
    assert len(items_hidden) == 1
    assert items_hidden[0].in_stock is True


def test_aztech_scraper_parses_search_template():
    html = """
    <html>
      <body>
        <script id="search-template" type="text/x-template">
          <div class="lastest-products-list">
            <div class="product-container">
              <div class="shared-product-card">
                <div class="image-container">
                  <a href="https://aztechonline.com/apple-iphone-17-pro">
                    <img src="https://aztechonline.com/cache/large/product/123/iphone.jpg" />
                  </a>
                </div>
                <div class="title-container">
                  <a href="https://aztechonline.com/apple-iphone-17-pro">
                    <span>Apple iPhone 17 Pro</span>
                  </a>
                  <div class="product-price"><span>€1,699.00</span></div>
                </div>
              </div>
            </div>
          </div>
        </script>
      </body>
    </html>
    """
    soup = BeautifulSoup(html, "lxml")
    scraper = AztechScraper()

    items = list(scraper.parse_products(soup, url="https://aztechonline.com"))

    assert len(items) == 1
    item = items[0]
    assert item.sku == "apple-iphone-17-pro"
    assert item.price == 1699.00
    assert item.product_url.endswith("/apple-iphone-17-pro")
    assert item.image_url.startswith("https://")
