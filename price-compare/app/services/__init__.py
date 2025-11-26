from .providers.tecstore import TecStoreScraper
from .providers.neptun import NeptunKSScraper
from .providers.gjirafamall import GjirafaMallScraper
from .providers.aztech import AztechScraper
from .providers.shopaz import ShopAzScraper

SCRAPERS = [
    TecStoreScraper(),
    NeptunKSScraper(),
    GjirafaMallScraper(),
    AztechScraper(),
    ShopAzScraper(),
]
