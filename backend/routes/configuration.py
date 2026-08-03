from fastapi import APIRouter
from models import AppConfig
import threading
import data.m5_data as m5_data

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
    # Persist into the pipeline's config store so every consumer
    # (SKU forecasts, hierarchy, backtests, KPIs, exceptions, inventory)
    # picks up the new values on the next call.
    m5_data.APP_CONFIG = _APP_CONFIG
    # Stale fits must not survive a config change: horizon, algorithm,
    # history window and outlier treatment all affect the series/inputs.
    m5_data.FORECAST_CACHE.clear()
    m5_data.BACKTEST_CACHE.clear()
    # Recompute KPIs/timeseries in the background — it takes minutes on a
    # large dataset and must not block the save request.
    threading.Thread(
        target=m5_data.recompute_forecast_timeseries,
        args=(),
        daemon=True,
        name='config-recompute',
    ).start()
    return _APP_CONFIG
