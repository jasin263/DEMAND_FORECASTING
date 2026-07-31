from fastapi import APIRouter
from models import AppConfig

router = APIRouter()

_APP_CONFIG = None

def _get_config():
    global _APP_CONFIG
    if _APP_CONFIG is None:
        defaults = AppConfig()
        _APP_CONFIG = defaults.model_dump()
    return _APP_CONFIG

@router.get("/api/tenants/nestle-fmcg-demo/configuration", response_model=AppConfig)
async def get_configuration():
    return _get_config()

@router.put("/api/tenants/nestle-fmcg-demo/configuration", response_model=AppConfig)
async def update_configuration(body: AppConfig):
    global _APP_CONFIG
    _APP_CONFIG = body.model_dump()
    return _APP_CONFIG
