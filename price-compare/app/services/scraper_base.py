"""Deprecated compatibility wrapper.

The new Template Method base class lives in services.scraping.base.
Import BaseScraper/slugify_name from there instead of using this module.
"""

from .scraping.base import BaseScraper as Scraper, slugify_name  # pragma: no cover
