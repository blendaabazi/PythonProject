from app.services.scraping.base import parse_price, slugify_name


def test_parse_price_variants():
    assert parse_price("1.299,00 €") == 1299.0
    assert parse_price("1,299.00 EUR") == 1299.0
    assert parse_price("1299") == 1299.0


def test_slugify_name():
    assert slugify_name("Apple iPhone 15 Pro Max") == "apple-iphone-15-pro-max"
