"""4. Demand sensing — short-term signal blending (POS, sell-in, sell-out)."""
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Query
import numpy as np
from data import m5_data
import forecast_engine as fe

logger = logging.getLogger(__name__)
router = APIRouter()

GLOBAL_SENSING_CONFIG = {
    "posWeight": 0.5, "sellInWeight": 0.3, "sellOutWeight": 0.2,
    "smoothingWindow": 4, "outlierThreshold": 2.5
}

@router.get("/api/tenants/nestle-fmcg-demo/demand-sensing")
async def get_demand_sensing(sku_limit: int = Query(20, ge=1, le=50)):
    m5_data._lazy_init()
    results = []
    for sku in m5_data.SKUS[:sku_limit]:
        series = sku.get('fullTrend', sku['trend'])
        arr = np.array(series, dtype=float)
        arr = np.nan_to_num(arr, nan=0.0)
        if len(arr) < 8:
            continue
        signals = _build_signals(arr)
        blended = _compute_blended(signals, GLOBAL_SENSING_CONFIG)
        holdout = fe.quick_holdout_stats(arr.tolist(), horizon=8)
        results.append({
            "skuId": sku['id'], "skuName": sku['name'],
            "signals": blended[-26:], "config": GLOBAL_SENSING_CONFIG,
            "blendedMape": round(float(holdout['mape']), 1),
            "channelsAvailable": {"pos": True, "sellIn": False, "sellOut": False,
                                  "storeStock": False, "warehouseStock": False},
            "lastUpdated": datetime.now(timezone.utc).isoformat(),
        })
    maps = [r['blendedMape'] for r in results if r['blendedMape'] is not None]
    overall = round(float(np.mean(maps)), 1) if maps else None
    return {"results": results, "globalConfig": GLOBAL_SENSING_CONFIG, "overallMape": overall}


def _build_signals(arr):
    """Channel signals from the loaded dataset.

    The uploaded sales file IS point-of-sale data, so the POS channel is the
    real demand series. The dataset has no sell-in / sell-out / stock channel
    columns — those are returned as None (unavailable) instead of fabricated,
    and the blended signal uses only the channels we actually have.
    """
    return [
        {"date": f"w{i}", "pos": max(0, round(float(v), 1)),
         "sellIn": None, "sellOut": None,
         "storeStock": None, "warehouseStock": None, "blended": None}
        for i, v in enumerate(arr)
    ]


def _compute_blended(signals, config):
    """Blend available channels and smooth. Only POS exists in this dataset."""
    for s in signals:
        s['blended'] = s['pos'] or 0
    w = config['smoothingWindow']
    if w > 1 and len(signals) >= w:
        vals = [s['blended'] or 0 for s in signals]
        smoothed = list(np.convolve(vals, np.ones(w) / w, mode='same'))
        for i, s in enumerate(signals):
            s['blended'] = round(float(smoothed[i]), 1)
    return signals


@router.post("/api/tenants/nestle-fmcg-demo/demand-sensing/config")
async def update_sensing_config(config: dict):
    GLOBAL_SENSING_CONFIG.update(config)
    return GLOBAL_SENSING_CONFIG
