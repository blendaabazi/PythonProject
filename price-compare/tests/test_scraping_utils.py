from bs4 import BeautifulSoup
from app.services.scraping.base import (
    parse_price,
    slugify_name,
    normalize_url,
    dedupe_urls,
    extract_image_urls_from_tag,
)


def test_parse_price_variants():
    assert parse_price("1.299,00 €") == 1299.0
    assert parse_price("1,299.00 EUR") == 1299.0
    assert parse_price("1299") == 1299.0


def test_slugify_name():
    assert slugify_name("Apple iPhone 15 Pro Max") == "apple-iphone-15-pro-max"


def test_normalize_url_variants():
    assert normalize_url("https://example.com/x.png", "https://base.test") == "https://example.com/x.png"
    assert normalize_url("//cdn.test/img.jpg", "https://base.test") == "https://cdn.test/img.jpg"
    assert normalize_url("/img.jpg", "https://base.test") == "https://base.test/img.jpg"


def test_dedupe_urls_preserves_order():
    assert dedupe_urls(["a", "a", "b", "", "b"]) == ["a", "b"]


def test_extract_image_urls_from_tag():
    html = (
        '<img src="/img.jpg" data-src="https://cdn.test/x.png" '
        'ng-src="/ng.jpg" srcset="/a.png 1x, /b.png 2x" />'
    )
    soup = BeautifulSoup(html, "lxml")
    img = soup.select_one("img")
    urls = extract_image_urls_from_tag(img, "https://base.test")
    assert urls == [
        "https://cdn.test/x.png",
        "https://base.test/img.jpg",
        "https://base.test/ng.jpg",
        "https://base.test/a.png",
        "https://base.test/b.png",
    ]
