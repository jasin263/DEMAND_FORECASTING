"""6. External factor modeling — weather, macro, competitive, calendar."""
import logging
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Query
import numpy as np
from data import m5_data

logger = logging.getLogger(__name__)
router = APIRouter()

# Weather / macroeconomic / competitive factors have no external data source in
# the uploaded dataset — they are marked unavailable instead of being faked.
FACTORS = [
    {"id": "temperature", "name": "Average Temperature (°C)", "type": "weather",
     "description": "Weekly avg temperature — no external feed in uploaded dataset", "enabled": False,
     "unavailable": True},
    {"id": "precipitation", "name": "Precipitation (mm)", "type": "weather",
     "description": "Weekly total precipitation — no external feed in uploaded dataset", "enabled": False,
     "unavailable": True},
    {"id": "gdp_index", "name": "GDP Index", "type": "macroeconomic",
     "description": "Monthly GDP growth indicator — no external feed in uploaded dataset", "enabled": False,
     "unavailable": True},
    {"id": "cpi", "name": "Consumer Price Index", "type": "macroeconomic",
     "description": "Monthly CPI inflation — no external feed in uploaded dataset", "enabled": False,
     "unavailable": True},
    {"id": "promo_intensity", "name": "Competitive Promo Intensity", "type": "competitive",
     "description": "Avg competitor discount depth — no external feed in uploaded dataset", "enabled": False,
     "unavailable": True},
    {"id": "ad_spend", "name": "Competitive Ad Spend", "type": "competitive",
     "description": "Estimated competitor ad spend index — no external feed in uploaded dataset", "enabled": False,
     "unavailable": True},
    {"id": "holiday_flag", "name": "Holiday/Event Flag", "type": "calendar",
     "description": "Major holiday or event this week (real calendar)", "enabled": True},
    {"id": "monthly_seasonality", "name": "Monthly Seasonality Factor", "type": "calendar",
     "description": "Seasonal multiplier derived from the uploaded demand", "enabled": True},
]

# Fixed-date holidays (real calendar, deterministic)
HOLIDAYS = {(1, 1): "New Year", (7, 4): "Independence Day", (11, 28): "Thanksgiving",
            (12, 25): "Christmas", (12, 31): "New Year's Eve"}


def _week_dates() -> list[tuple[str, datetime]]:
    """Parse WEEK_KEYS ('2021-W01') into real week timestamps."""
    out = []
    for wk in m5_data.WEEK_KEYS:
        try:
            year, wnum = wk.split('-W')
            d = datetime.strptime(f'{year}-W{wnum}-1', '%G-W%V-%u')
            out.append((wk, d))
        except Exception:
            continue
    return out


def _monthly_seasonality() -> list[tuple[str, float]]:
    """Real seasonal multiplier per week: aggregate demand by month vs overall mean."""
    weeks = _week_dates()
    if not weeks or not m5_data.SKUS:
        return []
    agg = np.zeros(len(weeks), dtype=float)
    for sku in m5_data.SKUS:
        vals = np.asarray(sku.get('fullTrend') or [], dtype=float)
        n = min(len(vals), len(weeks))
        if n > 0:
            agg[:n] += vals[:n]
    months = [d.month for _, d in weeks]
    month_means, month_counts = {}, {}
    for m, v in zip(months, agg):
        month_means[m] = month_means.get(m, 0.0) + v
        month_counts[m] = month_counts.get(m, 0) + 1
    overall = float(np.mean(agg)) if len(agg) else 0.0
    if overall <= 0:
        return []
    factors = []
    for wk, d in weeks:
        m = d.month
        mean = month_means.get(m, 0.0) / max(month_counts.get(m, 1), 1)
        factors.append((wk, mean / overall))
    return factors


def _pearson(a: np.ndarray, b: np.ndarray) -> float:
    n = min(len(a), len(b))
    if n < 3:
        return 0.0
    a, b = a[:n], b[:n]
    if np.std(a) == 0 or np.std(b) == 0:
        return 0.0
    return float(np.corrcoef(a, b)[0, 1])


@router.get("/api/tenants/nestle-fmcg-demo/external-factors")
def get_external_factors(sku_limit: int = Query(20, ge=1, le=50)):
    m5_data._lazy_init()
    weeks = _week_dates()
    seasonality = _monthly_seasonality()
    holiday_series = [1.0 if (d.month, d.day) in HOLIDAYS else 0.0 for _, d in weeks]
    season_series = [v for _, v in seasonality]

    factors = []
    for f in FACTORS:
        if f.get('unavailable'):
            factors.append({**f, "data": [], "correlation": 0.0, "lagDetected": None})
            continue
        if f['id'] == 'holiday_flag':
            series = [{"date": wk, "value": v} for (wk, _), v in zip(weeks, holiday_series)]
        else:
            series = [{"date": wk, "value": round(v, 4)} for (wk, v) in seasonality]
        factors.append({**f, "data": series, "correlation": 0.0, "lagDetected": None})

    # Real correlations of SKU demand against each enabled calendar factor
    sku_corrs = []
    for sku in m5_data.SKUS[:min(sku_limit, 20)]:
        vals = np.asarray(sku.get('fullTrend') or [], dtype=float)
        corrs = []
        for f in factors:
            if not f['enabled']:
                continue
            if f['id'] == 'holiday_flag':
                r = _pearson(vals, np.asarray(holiday_series))
            else:
                r = _pearson(vals, np.asarray(season_series))
            corrs.append({"factorId": f['id'], "factorName": f['name'],
                          "correlation": round(max(min(r, 1.0), -1.0), 2), "lag": None})
        sku_corrs.append({"skuId": sku['id'], "skuName": sku['name'], "correlations": corrs})
    return {"factors": factors, "skuCorrelations": sku_corrs,
            "lastSynced": datetime.now(timezone.utc).isoformat()}

@router.post("/api/tenants/nestle-fmcg-demo/external-factors/{factor_id}/toggle")
async def toggle_factor(factor_id: str, body: dict):
    for f in FACTORS:
        if f['id'] == factor_id:
            if f.get('unavailable') and body.get('enabled', True):
                return {"error": "no data source for this factor", "factor": f}
            f['enabled'] = body.get('enabled', not f['enabled'])
            return f
    return {"error": "not found"}
