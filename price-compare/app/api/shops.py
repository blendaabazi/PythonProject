from fastapi import APIRouter, Depends
from ..dependencies import get_shop_repo
from ..schemas.models import ShopResponse

router = APIRouter(prefix="/shops", tags=["shops"])


@router.get("/", response_model=list[ShopResponse])
def list_shops(shop_repo=Depends(get_shop_repo)):
    shops = shop_repo.list_shops()
    return [ShopResponse(code=shop.code.value, name=shop.name) for shop in shops]
