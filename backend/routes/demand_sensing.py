"""4. Demand sensing — short-term signal blending (POS, sell-in, sell-out)."""
import logging
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Query
import numpy as np
from data import m5_data

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
        signals = _build_signals(arr, sku)
        blended = _compute_blended(signals, GLOBAL_SENSING_CONFIG)
        mape_val = None
        if len(blended) > 4:
            actuals = [s['sellIn'] or s['pos'] or 0 for s in blended[-8:]]
            blended_vals = [s['blended'] or 0 for s in blended[-8:]]
            if any(a > 0 for a in actuals):
                ape = [abs(a - b) / a * 100 for a, b in zip(actuals, blended_vals) if a > 0]
                mape_val = round(float(np.mean(ape)), 1) if ape else None
        results.append({"skuId": sku['id'], "skuName": sku['name'],
                        "signals": blended[-26:], "config": GLOBAL_SENSING_CONFIG,
                        "blendedMape": mape_val, "lastUpdated": datetime.now(timezone.utc).isoformat()})
    overall = None
    maps = [r['blendedMape'] for r in results if r['blendedMape'] is not None]
    if maps:
        overall = round(float(np.mean(maps)), 1)
    return {"results": results, "globalConfig": GLOBAL_SENSING_CONFIG, "overallMape": overall}

def _build_signals(arr, sku):
    """Derive channel signals deterministically from the real demand series.

    The uploaded dataset has no per-channel columns, so channel values are
    estimated as fixed structural shares of the actual demand — fully
    deterministic and reproducible, with no injected randomness.
    """
    signals = []
    for i, v in enumerate(arr):
        pos = v * 0.95
        sell_in = v * 0.90
        sell_out = v * 0.88
        store = v * 0.35
        warehouse = v * 0.55
        signals.append({"date": f"w{i}", "pos": max(0, round(pos, 1)),
                        "sellIn": max(0, round(sell_in, 1)), "sellOut": max(0, round(sell_out, 1)),
                        "storeStock": max(0, round(store, 1)), "warehouseStock": max(0, round(warehouse, 1)),
                        "blended": None})
    return signals

def _compute_blended(signals, config):
    for i, s in enumerate(signals):
        pos = s['pos'] or 0
        sell_in = s['sellIn'] or 0
        sell_out = s['sellOut'] or 0
        if pos == 0 and sell_in == 0 and sell_out == 0:
            s['blended'] = 0
        else:
            s['blended'] = round(pos * config['posWeight'] + sell_in * config['sellInWeight'] + sell_out * config['sellOutWeight'], 1)
    w = config['smoothingWindow']
    if w > 1 and len(signals) >= w:
        vals = [s['blended'] or 0 for s in signals]
        smoothed = list(np.convolve(vals, np.ones(w)/w, mode='same'))
        for i, s in enumerate(signals):
            s['blended'] = round(float(smoothed[i]), 1)
    return signals

@router.post("/api/tenants/nestle-fmcg-demo/demand-sensing/config")
async def update_sensing_config(config: dict):
    GLOBAL_SENSING_CONFIG.update(config)
    return GLOBAL_SENSING_CONFIG
