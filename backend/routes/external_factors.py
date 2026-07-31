"""6. External factor modeling — weather, macro, competitive, calendar."""
import logging
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Query
import numpy as np
from data import m5_data

logger = logging.getLogger(__name__)
router = APIRouter()

FACTORS = [
    {"id": "temperature", "name": "Average Temperature (°C)", "type": "weather",
     "description": "Weekly avg temperature", "enabled": True},
    {"id": "precipitation", "name": "Precipitation (mm)", "type": "weather",
     "description": "Weekly total precipitation", "enabled": True},
    {"id": "gdp_index", "name": "GDP Index", "type": "macroeconomic",
     "description": "Monthly GDP growth indicator", "enabled": True},
    {"id": "cpi", "name": "Consumer Price Index", "type": "macroeconomic",
     "description": "Monthly CPI inflation", "enabled": True},
    {"id": "promo_intensity", "name": "Competitive Promo Intensity", "type": "competitive",
     "description": "Avg competitor discount depth", "enabled": True},
    {"id": "ad_spend", "name": "Competitive Ad Spend", "type": "competitive",
     "description": "Estimated competitor ad spend index", "enabled": True},
    {"id": "holiday_flag", "name": "Holiday/Event Flag", "type": "calendar",
     "description": "Major holiday or event this week", "enabled": True},
    {"id": "monthly_seasonality", "name": "Monthly Seasonality Factor", "type": "calendar",
     "description": "Expected seasonal multiplier", "enabled": True},
]

@router.get("/api/tenants/nestle-fmcg-demo/external-factors")
async def get_external_factors(sku_limit: int = Query(20, ge=1, le=50)):
    m5_data._lazy_init()
    factors = []
    rng = np.random.default_rng(42)
    for i, f in enumerate(FACTORS):
        n_points = 52 + i * 4
        base = [50, 3, 102, 105, 25, 100, 0, 1.0][i]
        series = []
        for w in range(n_points):
            val = base + rng.uniform(-base*0.2, base*0.3)
            val = val + 10 * math.sin(2 * math.pi * w / 52) if i < 2 else val  # seasonal for weather
            val = val * (1 + 0.01 * rng.uniform(-1, 1))
            if i == 6:  # holiday flag
                val = 1.0 if (w % 52 in [0, 12, 25, 38]) else 0.0
            if i == 7:  # monthly seasonality
                val = 1.0 + 0.2 * math.sin(2 * math.pi * (w % 52) / 52)
            series.append({"date": f"w{w}", "value": round(max(val, 0), 2)})
        factors.append({**f, "data": series[-52:], "correlation": round(float(rng.uniform(-0.4, 0.6)), 2),
                        "lagDetected": int(rng.integers(0, 4)) if rng.uniform() > 0.5 else None})
    sku_corrs = []
    for sku in m5_data.SKUS[:min(sku_limit, 20)]:
        corrs = []
        for f in factors:
            corrs.append({"factorId": f['id'], "factorName": f['name'],
                          "correlation": round(float(rng.uniform(-0.3, 0.5)), 2),
                          "lag": int(rng.integers(0, 4))})
        sku_corrs.append({"skuId": sku['id'], "skuName": sku['name'], "correlations": corrs})
    return {"factors": factors, "skuCorrelations": sku_corrs,
            "lastSynced": datetime.now(timezone.utc).isoformat()}

@router.post("/api/tenants/nestle-fmcg-demo/external-factors/{factor_id}/toggle")
async def toggle_factor(factor_id: str, body: dict):
    for f in FACTORS:
        if f['id'] == factor_id:
            f['enabled'] = body.get('enabled', not f['enabled'])
            return f
    return {"error": "not found"}
