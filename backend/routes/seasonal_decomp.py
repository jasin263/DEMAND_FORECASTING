"""2. Seasonality decomposition — trend/seasonal/residual breakdown per SKU."""
import logging
from fastapi import APIRouter, Query
import numpy as np
from data import m5_data
from statsmodels.tsa.seasonal import seasonal_decompose

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/api/tenants/nestle-fmcg-demo/seasonal-decomposition")
async def get_seasonal_decomposition(
    period: int = Query(52, ge=4, le=104),
    sku_limit: int = Query(20, ge=1, le=50),
):
    m5_data._lazy_init()
    results = []
    for sku in m5_data.SKUS[:sku_limit]:
        series = sku.get('fullTrend', sku['trend'])
        arr = np.array(series, dtype=float)
        arr = np.nan_to_num(arr, nan=0.0)
        if len(arr) < period + 4:
            continue
        try:
            decomp = seasonal_decompose(arr, model='additive', period=period, extrapolate_trend='freq')
            trend = decomp.trend
            seasonal = decomp.seasonal
            residual = decomp.resid
        except Exception:
            trend = np.full_like(arr, np.nan)
            seasonal = np.full_like(arr, 0.0)
            residual = np.full_like(arr, np.nan)
        weeks = [f"w{i}" for i in range(len(arr))]
        components = []
        for i in range(len(arr)):
            t = trend[i] if not np.isnan(trend[i]) else arr[i]
            s = seasonal[i] if not np.isnan(seasonal[i]) else 0.0
            r = residual[i] if not np.isnan(residual[i]) else 0.0
            components.append({"week": weeks[i], "trend": round(float(t), 1),
                               "seasonal": round(float(s), 1), "residual": round(float(r), 1),
                               "actual": round(float(arr[i]), 1)})
        seasonal_amp = float(np.nanmean(np.abs(seasonal))) if np.any(~np.isnan(seasonal)) else 0
        actual_mean = float(np.nanmean(arr)) if np.any(arr) else 1
        strength = min(1.0, seasonal_amp / max(actual_mean, 0.01))
        direction = 'up' if (trend[-1] if not np.isnan(trend[-1]) else arr[-1]) > (trend[0] if not np.isnan(trend[0]) else arr[0]) else 'down'
        results.append({"skuId": sku['id'], "skuName": sku['name'],
                        "category": sku['category'], "components": components[-period*2:],
                        "seasonalStrength": round(strength, 3),
                        "dominantPeriod": period, "trendDirection": direction})
    return {"skus": results, "method": "additive", "period": period}
