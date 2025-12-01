from .providers.tecstore import TecStoreScraper
from .providers.neptun import NeptunKSScraper
from .providers.gjirafamall import GjirafaMallScraper
from .providers.aztech import AztechScraper
from .providers.shopaz import ShopAzScraper
from .providers.gjirafamall_single import GjirafaMallIphone16Scraper

SCRAPERS = [
    TecStoreScraper(),
    NeptunKSScraper(),
    GjirafaMallScraper(),
    AztechScraper(),
    ShopAzScraper(),
    GjirafaMallIphone16Scraper(),
]
