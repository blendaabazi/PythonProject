import json
from ..scraping.base import BaseScraper, ScrapedItem, parse_price, slugify_name, looks_like_accessory
from ...domain.enums import ShopName, ProductCategory


class NeptunKSScraper(BaseScraper):
    store = ShopName.NEPTUN
    category = ProductCategory.SMARTPHONE
    BASE_URL = "https://www.neptun-ks.com/smartphone.nspx?brands=987&page={page}&priceRange=709_2799"
    max_pages = 5

    def base_url(self) -> str:
        return self.BASE_URL.format(page=1)

    def target_urls(self):
        for page in range(1, self.max_pages + 1):
            yield self.BASE_URL.format(page=page)

    def _extract_model(self, soup, var_name: str):
        marker = f"{var_name} = \""
        for script in soup.find_all("script"):
            text = script.string or script.get_text()
            if not text or marker not in text:
                continue
            start = text.find(marker)
            if start == -1:
                continue
            i = start + len(marker)
            buf = []
            escaped = False
            while i < len(text):
                ch = text[i]
                if escaped:
                    buf.append(ch)
                    escaped = False
                else:
                    if ch == "\\":
                        escaped = True
                        buf.append(ch)
                    elif ch == "\"":
                        break
                    else:
                        buf.append(ch)
                i += 1
            raw = "".join(buf)
            try:
                unescaped = bytes(raw, "utf-8").decode("unicode_escape")
                return json.loads(unescaped)
            except (UnicodeDecodeError, json.JSONDecodeError):
                continue
        return None

    def parse_products(self, soup, url):
        model = self._extract_model(soup, "shopCategoryModel")
        if model:
            for product in model.get("Products", []):
                name = (product.get("Title") or "").strip()
                if not name:
                    continue
                if "iphone" not in name.lower() or looks_like_accessory(name):
                    continue
                price = product.get("ActualPrice") or product.get("RegularPrice")
                if price is None:
                    continue
                currency = product.get("Currency") or "EUR"
                category_slug = None
                category = product.get("Category") or model.get("Category")
                if isinstance(category, dict):
                    category_slug = category.get("Url") or category.get("url")
                product_slug = product.get("Url")
                if category_slug and product_slug:
                    product_url = f"https://www.neptun-ks.com/categories/{category_slug}/{product_slug}"
                else:
                    product_url = url
                sku = slugify_name(name)
                yield ScrapedItem(
                    sku=sku,
                    name=name,
                    price=float(price),
                    currency=currency,
                    product_url=product_url,
                    in_stock=True,
                    brand="Apple",
                )
            return

        cards = soup.select(".product-item, .product, .item")
        for card in cards:
            name_el = card.select_one(".product-name, .product-title, h3 a")
            price_el = card.select_one(".price, .product-price, .current-price")
            link_el = card.select_one("a")
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
            product_url = href if href.startswith("http") else f"https://www.neptun-ks.com{href}"
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
