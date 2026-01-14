import html
import json
import re
from bs4 import BeautifulSoup
from ..scraping.base import (
    PagedScraper,
    ScrapedItem,
    slugify_name,
    looks_like_accessory,
    extract_image_urls_from_tag,
    dedupe_urls,
)
from ...config import settings
from ...domain.enums import ShopName, ProductCategory


class NeptunKSScraper(PagedScraper):
    store = ShopName.NEPTUN
    category = ProductCategory.SMARTPHONE
    BASE_URL = "https://www.neptun-ks.com/smartphone.nspx?brands=987&page={page}&priceRange=709_2799"
    max_pages = 5

    def __init__(self) -> None:
        super().__init__()
        # Disable environment proxies that can block direct site access.
        self._session.trust_env = False
        self._session.proxies = {"http": None, "https": None}

    def base_url(self) -> str:
        return self.BASE_URL.format(page=1)

    def base_url_for_page(self, page: int) -> str:
        return self.BASE_URL.format(page=page)

    def _get(self, url: str) -> str:
        """Override to include Referer; Neptun blocks some requests without it."""
        self._throttle()
        headers = {
            "User-Agent": "Mozilla/5.0",
            "Referer": "https://www.neptun-ks.com/",
        }
        resp = self._session.get(
            url,
            headers=headers,
            timeout=settings.scrape_timeout_sec,
            proxies={"http": None, "https": None},
        )
        resp.raise_for_status()
        return resp.text

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
                unescaped = html.unescape(unescaped)
                return json.loads(unescaped)
            except (UnicodeDecodeError, json.JSONDecodeError):
                continue
        return None

    def _coerce_image_url(self, value):
        if isinstance(value, dict):
            for key in (
                "FullUrl",
                "ImageUrl",
                "Url",
                "url",
                "Path",
                "path",
                "RelativePath",
                "relativePath",
                "FileName",
                "Filename",
                "ImagePath",
                "imagePath",
            ):
                url = value.get(key)
                if url:
                    return url
        if isinstance(value, str):
            return value
        return None

    def _extract_images_from_model(self, product) -> list[str]:
        images: list[str] = []
        for key in (
            "DefaultPicture",
            "DefaultPictureModel",
            "Picture",
            "Image",
            "MainImage",
            "MainPicture",
            "LargeImage",
            "Thumbnail",
            "ThumbnailUrl",
            "ThumbnailURL",
        ):
            url = self._coerce_image_url(product.get(key))
            if url:
                images.append(url)
        for key in ("Pictures", "Images", "Gallery", "AdditionalPictures", "Thumbnails"):
            items = product.get(key)
            if isinstance(items, list) and items:
                for item in items:
                    url = self._coerce_image_url(item)
                    if url:
                        images.append(url)
            elif isinstance(items, str):
                images.extend(self._extract_images_from_payload(items))
        for key in (
            "ImageUrl",
            "ImageURL",
            "imageUrl",
            "imageURL",
            "PictureUrl",
            "PictureURL",
            "pictureUrl",
            "pictureURL",
            "DefaultPictureUrl",
            "DefaultPictureURL",
        ):
            url = product.get(key)
            if url:
                images.append(url)
        # Generic catch-all: pick up any string fields that look like image URLs.
        for key, val in product.items():
            if isinstance(val, str):
                if re.search(r"\.(?:jpe?g|png|webp|gif)(?:\?|$)", val, re.IGNORECASE):
                    images.append(val)
            elif isinstance(val, list):
                for item in val:
                    if isinstance(item, str) and re.search(r"\.(?:jpe?g|png|webp|gif)(?:\?|$)", item, re.IGNORECASE):
                        images.append(item)
        normalized = [self.normalize_url(url, "https://www.neptun-ks.com") for url in images]
        return dedupe_urls([url for url in normalized if url])

    def _extract_images_from_payload(self, raw: str) -> list[str]:
        if not raw:
            return []
        urls: list[str] = []
        payload = None
        cleaned = raw.strip()
        for candidate in (cleaned, html.unescape(cleaned)):
            try:
                payload = json.loads(candidate)
                break
            except json.JSONDecodeError:
                payload = None
        if isinstance(payload, dict):
            urls.extend(self._extract_images_from_model(payload))
            for key in ("images", "gallery", "pictures", "thumbs", "thumbnails"):
                items = payload.get(key)
                if isinstance(items, list):
                    for item in items:
                        url = self._coerce_image_url(item)
                        if url:
                            urls.append(url)
                elif isinstance(items, str):
                    urls.append(items)
            for key in (
                "image",
                "image_url",
                "imageUrl",
                "imageURL",
                "thumbnail",
                "thumbnailUrl",
                "thumbnailURL",
                "Thumbnail",
                "ThumbnailUrl",
                "ThumbnailURL",
            ):
                url = payload.get(key)
                if isinstance(url, str):
                    urls.append(url)
            nested = payload.get("product") or payload.get("Product")
            if isinstance(nested, dict):
                urls.extend(self._extract_images_from_model(nested))
        elif isinstance(payload, list):
            for item in payload:
                url = self._coerce_image_url(item) if not isinstance(item, str) else item
                if url:
                    urls.append(url)
        elif isinstance(payload, str):
            urls.append(payload)
        else:
            candidate = raw.strip()
            if candidate.startswith(("http://", "https://", "/", "//")):
                urls.append(candidate)
            else:
                urls.extend([item.strip() for item in raw.split(",") if item.strip()])
        normalized = [self.normalize_url(url, "https://www.neptun-ks.com") for url in urls]
        return dedupe_urls([url for url in normalized if url])

    def _extract_images_from_tag(self, tag) -> list[str]:
        if tag is None:
            return []
        urls = extract_image_urls_from_tag(tag, "https://www.neptun-ks.com")
        for attr in ("data-zoom-image", "data-large-image", "data-full", "data-image"):
            value = tag.get(attr)
            if value:
                normalized = self.normalize_url(value, "https://www.neptun-ks.com")
                if normalized:
                    urls.append(normalized)
        return dedupe_urls(urls)

    def _extract_images_from_text(self, text: str) -> list[str]:
        if not text:
            return []
        urls: list[str] = []
        priority: list[str] = []
        pattern = re.compile(
            r"(?i)(?:[\"'])?(?P<key>Thumbnail|ThumbnailUrl|ThumbnailURL|ImageUrl|ImageURL|imageUrl|imageURL|"
            r"FullUrl|PictureUrl|pictureUrl|MainImage|LargeImage|Path|RelativePath|relativePath|"
            r"FileName|Filename|ImagePath|imagePath|OriginalPath|originalPath|OriginalUrl|originalUrl)"
            r"(?:[\"'])?"
            r"\s*[:=]\s*[\"'](?P<val>[^\"']+)[\"']"
        )
        candidates = [text, html.unescape(text)]
        for candidate in candidates:
            for match in pattern.finditer(candidate):
                key = match.group("key").lower()
                val = match.group("val").strip()
                if not val:
                    continue
                val = val.replace("\\/", "/")
                if "\\u" in val or "\\x" in val:
                    try:
                        val = bytes(val, "utf-8").decode("unicode_escape")
                    except UnicodeDecodeError:
                        pass
                if not key.startswith("thumbnail") and not re.search(
                    r"\.(?:jpe?g|png|webp|gif)(?:\?|$)", val, re.IGNORECASE
                ):
                    continue
                normalized = self.normalize_url(val, "https://www.neptun-ks.com")
                if normalized:
                    target = priority if key.startswith("thumbnail") or key in {
                        "imageurl",
                        "mainimage",
                        "largeimage",
                        "pictureurl",
                        "fullurl",
                        "imagepath",
                        "relativepath",
                        "originalpath",
                        "originalurl",
                    } else urls
                    target.append(normalized)
        combined = priority + urls
        blocked = ("banner", "cart", "logo", "icon", "sprite", "favicon")
        filtered = [url for url in combined if not any(token in url.lower() for token in blocked)]
        return dedupe_urls(filtered or combined)

    def _extract_gallery_images(self, product_url: str) -> list[str]:
        try:
            html = self._get(product_url)
        except Exception:
            return []
        soup = BeautifulSoup(html, self.parser)
        selectors = [
            "#productDescriptionTag .product-details-first-col__images img",
            ".product-details-first-col__images img",
            ".product-gallery img",
            ".gallery img",
            ".product-images img",
            ".thumbs img",
            ".product-details img",
            ".eyeWrapper img",
            ".imgWrapper img",
            ".imgSlip img",
        ]
        for selector in selectors:
            imgs = soup.select(selector)
            if not imgs:
                continue
            urls: list[str] = []
            for img in imgs:
                urls.extend(self._extract_images_from_tag(img))
            if urls:
                return dedupe_urls(urls)
        urls: list[str] = []
        for script in soup.find_all("script"):
            text = script.string or script.get_text()
            urls.extend(self._extract_images_from_text(text))
        if urls:
            return dedupe_urls(urls)
        meta_urls = self._extract_meta_images(soup)
        if meta_urls:
            return meta_urls
        dom_urls = self._extract_images_from_dom(soup)
        if dom_urls:
            return dom_urls
        return self._extract_images_from_text(html)

    def _extract_images_from_dom(self, soup) -> list[str]:
        """Collect images from visible img/source tags on the page."""
        urls: list[str] = []
        for tag in soup.select("img, source"):
            urls.extend(self._extract_images_from_tag(tag))
            for attr in ("ng-src", "data-ng-src"):
                val = tag.get(attr)
                if val:
                    normalized = self.normalize_url(val, "https://www.neptun-ks.com")
                    if normalized:
                        urls.append(normalized)
        return dedupe_urls(urls)

    def _extract_meta_images(self, soup) -> list[str]:
        """Fallback for pages exposing images via OG/Twitter/meta tags."""
        urls: list[str] = []
        meta_selectors = [
            ("meta[property='og:image']", "content"),
            ("meta[property='og:image:url']", "content"),
            ("meta[name='twitter:image']", "content"),
            ("meta[name='twitter:image:src']", "content"),
            ("meta[itemprop='image']", "content"),
            ("meta[name='image']", "content"),
            ("link[rel='image_src']", "href"),
            ("link[rel='preload'][as='image']", "href"),
        ]
        for selector, attr in meta_selectors:
            for tag in soup.select(selector):
                val = tag.get(attr)
                if val:
                    urls.append(val)
        for script in soup.select("script[type='application/ld+json']"):
            try:
                data = json.loads(script.string or script.get_text() or "")
            except Exception:
                continue
            if isinstance(data, dict):
                image_val = data.get("image") or data.get("Image")
                if isinstance(image_val, list):
                    urls.extend(image_val)
                elif isinstance(image_val, str):
                    urls.append(image_val)
        normalized = [self.normalize_url(url, "https://www.neptun-ks.com") for url in urls]
        return dedupe_urls([url for url in normalized if url])

    def parse_products(self, soup, url):
        # Preferred: parse Angular category bootstrap payload if present.
        for item in self._parse_category_details(soup, url):
            yield item

        model = None
        for var_name in ("shopCategoryModel", "catalogProductsModel", "categoryModel", "productListModel"):
            model = self._extract_model(soup, var_name)
            if model:
                break
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
                product_slug = product.get("Url") or product.get("url") or product.get("Slug")
                product_url = None
                if product_slug:
                    if category_slug and not product_slug.startswith(("http://", "https://", "/")):
                        product_url = f"https://www.neptun-ks.com/categories/{category_slug}/{product_slug}"
                    else:
                        product_url = self.normalize_url(product_slug, "https://www.neptun-ks.com")
                        if not product_url:
                            product_url = url

                image_urls = self._extract_images_from_model(product)
                if not image_urls and product_url:
                    # Prefer fetching the product page to grab the canonical gallery.
                    image_urls = self._extract_gallery_images(product_url)
                if not image_urls:
                    image_urls = self._extract_images_from_dom(soup)
                image_url = image_urls[0] if image_urls else None
                sku = slugify_name(name)
                yield ScrapedItem(
                    sku=sku,
                    name=name,
                    price=float(price),
                    currency=currency,
                    product_url=product_url,
                    in_stock=True,
                    brand="Apple",
                    image_url=image_url,
                    image_urls=image_urls or None,
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
                price = self.parse_price(price_el.get_text(" ", strip=True))
            except Exception:
                continue
            href = link_el.get("href") or ""
            product_url = href if href.startswith("http") else f"https://www.neptun-ks.com{href}"
            image_urls: list[str] = []
            img_el = card.select_one("img")
            image_urls.extend(self._extract_images_from_tag(img_el))
            source_el = card.select_one("source")
            image_urls.extend(self._extract_images_from_tag(source_el))
            # Angular templates often store the real URL in ng-src/data-ng-src.
            for tag in (img_el, source_el):
                if not tag:
                    continue
                for attr in ("ng-src", "data-ng-src"):
                    val = tag.get(attr)
                    if val:
                        normalized = self.normalize_url(val, "https://www.neptun-ks.com")
                        if normalized:
                            image_urls.append(normalized)
            # Also inspect any inline data-gallery payload on the image itself.
            for attr_name in ("data-gallery", "data-images", "data-pictures", "data-thumbs"):
                raw = img_el.get(attr_name) if img_el else None
                if raw:
                    image_urls.extend(self._extract_images_from_payload(raw))
            for attr_name in (
                "data-images",
                "data-gallery",
                "data-pictures",
                "data-thumbs",
                "data-product",
                "data-item",
                "data-gtm",
                "data-gtm-product",
            ):
                raw = card.get(attr_name)
                if raw:
                    image_urls.extend(self._extract_images_from_payload(raw))
            for attr_name in (
                "data-images",
                "data-gallery",
                "data-pictures",
                "data-thumbs",
                "data-zoom-image",
                "data-large-image",
                "data-full",
                "data-image",
            ):
                raw = img_el.get(attr_name) if img_el else None
                if raw:
                    image_urls.extend(self._extract_images_from_payload(raw))
            if not image_urls and product_url:
                image_urls = self._extract_gallery_images(product_url)
            if not image_urls:
                image_urls = self._extract_images_from_dom(soup)
            image_urls = dedupe_urls(image_urls)
            image_url = image_urls[0] if image_urls else None
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
                image_urls=image_urls or None,
            )

    def _parse_category_details(self, soup, url):
        node = soup.select_one("#angularApp")
        if not node:
            return []
        raw = node.get("data-categorydetails")
        if not raw:
            return []
        try:
            payload = json.loads(html.unescape(raw))
        except Exception:
            return []
        products = payload.get("Products") or []
        items: list[ScrapedItem] = []
        for product in products:
            name = (product.get("Title") or "").strip()
            if not name or "iphone" not in name.lower() or looks_like_accessory(name):
                continue
            price = product.get("ActualPrice") or product.get("DiscountPrice") or product.get("RegularPrice")
            if price is None:
                continue
            currency = product.get("Currency") or "EUR"
            product_slug = product.get("Url") or product.get("url") or ""
            product_url = self.normalize_url(product_slug, "https://www.neptun-ks.com") if product_slug else url

            images: list[str] = []
            thumb = product.get("Thumbnail")
            if thumb:
                images.append(thumb)
            imgs = product.get("Images") or []
            if isinstance(imgs, list):
                images.extend(imgs)
            images = dedupe_urls([self.normalize_url(img, "https://www.neptun-ks.com") for img in images if img])
            image_url = images[0] if images else None

            manufacturer = product.get("Manufacturer") or {}
            brand = manufacturer.get("Name") if isinstance(manufacturer, dict) else None

            items.append(
                ScrapedItem(
                    sku=slugify_name(name),
                    name=name,
                    price=float(price),
                    currency=currency,
                    product_url=product_url,
                    in_stock=True,
                    brand=brand or "Apple",
                    image_url=image_url,
                    image_urls=images or None,
                )
            )
        return items
