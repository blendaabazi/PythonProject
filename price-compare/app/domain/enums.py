from enum import Enum


class ProductCategory(str, Enum):
    """Enumerates supported product categories."""

    SMARTPHONE = "smartphone"
    LAPTOP = "laptop"
    ACCESSORY = "accessory"


class ShopName(str, Enum):
    """Stable identifiers for supported shops."""

    TECSTORE = "tecstore"
    NEPTUN = "neptun"
    GJIRAFAMALL = "gjirafamall"
    AZTECH = "aztech"
    SHOPAZ = "shopaz"

    @classmethod
    def from_human(cls, name: str) -> "ShopName":
        normalized = name.strip().lower().replace(" ", "").replace("-", "")
        for candidate in cls:
            if normalized in {candidate.value, candidate.name.lower()}:
                return candidate
        raise ValueError(f"Unknown shop name: {name}")

    def display(self) -> str:
        mapping = {
            self.TECSTORE: "TecStore",
            self.NEPTUN: "Neptun KS",
            self.GJIRAFAMALL: "GjirafaMall",
            self.AZTECH: "Aztech",
            self.SHOPAZ: "ShopAz",
        }
        return mapping.get(self, self.value.title())
