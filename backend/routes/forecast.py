import logging
from fastapi import APIRouter, Query
from typing import Optional
from models import ForecastDataPoint
from data import m5_data
from generic_dataset import PENDING_USER_DATASET, load_user_dataset_into_m5

logger = logging.getLogger('forecast_routes')
router = APIRouter()


@router.get("/api/tenants/nestle-fmcg-demo/forecast-timeseries", response_model=list[ForecastDataPoint])
async def get_forecast_timeseries(
    weeks: int = Query(16, ge=1, le=52),
    refresh: bool = Query(False),
):
    if refresh:
        ts = m5_data.recompute_forecast_timeseries(weeks)
    else:
        ts = m5_data.get_forecast_timeseries()
    return ts[-min(weeks, len(ts)):]

@router.post("/api/tenants/nestle-fmcg-demo/forecast-timeseries/rerun")
async def rerun_forecast():
    """Trigger full forecast recomputation with ML models and return fresh data."""
    logger.info("rerun_forecast called")
    has_pending = PENDING_USER_DATASET.get('file_bytes') is not None
    logger.info("PENDING_USER_DATASET has file_bytes: %s", has_pending)

    if has_pending:
        logger.info(
            "Loading user dataset into m5_data. filename=%s, keys=%s",
            PENDING_USER_DATASET.get('filename'),
            list(PENDING_USER_DATASET.get('mapping', {}).keys()),
        )
        load_user_dataset_into_m5(
            PENDING_USER_DATASET['file_bytes'],
            PENDING_USER_DATASET['filename'],
            PENDING_USER_DATASET['mapping'],
        )
        PENDING_USER_DATASET.clear()
        logger.info("User dataset loaded. m5_data._initialized=%s, len(SKUS)=%d, len(FORECAST_TIMESERIES)=%d",
                     m5_data._initialized, len(m5_data.SKUS), len(m5_data.FORECAST_TIMESERIES))

    ts = m5_data.recompute_forecast_timeseries()
    logger.info("recompute done. returning %d weeks", len(ts))
    return {"status": "success", "message": "Forecast recomputed", "weeks": len(ts)}