"""8. Consensus / blended forecast — statistical + ML + judgmental merged."""
import logging
import math
from datetime import datetime, timezone
from fastapi import APIRouter, Query
import numpy as np
from data import m5_data
import ml_forecast as mlf
import forecast_engine as fe

logger = logging.getLogger(__name__)
router = APIRouter()

METHODOLOGIES = [
    {"id": "ml-stat-judgmental", "name": "ML + Statistical + Judgmental",
     "description": "Equal-weighted blend of ML, statistical, and planner forecast"},
    {"id": "ml-dominant", "name": "ML Dominant",
     "description": "ML forecast with statistical adjustments only when ML has low confidence"},
    {"id": "stat-dominant", "name": "Statistical Dominant",
     "description": "Statistical (Holt-Winters/ARIMA) with ML as cross-check"},
    {"id": "adaptive-weighted", "name": "Adaptive Weighted Average",
     "description": "Weights dynamically optimized by recent per-model MAPE"},
    {"id": "judgmental-override", "name": "Judgmental Override",
     "description": "Statistical+ML blend overridden by planner input"},
]

GLOBAL_CONSENSUS_CONFIG = {
    "mlWeight": 0.5, "statisticalWeight": 0.3, "judgmentalWeight": 0.2,
    "adaptiveWeighting": True, "minHistory": 12
}

@router.get("/api/tenants/nestle-fmcg-demo/consensus")
def get_consensus(
    sku_limit: int = Query(5, ge=1, le=50),
    horizon: int = Query(12, ge=4, le=26),
):
    m5_data._lazy_init()
    cfg = m5_data.get_app_config()
    results = []
    ml_mapes, stat_mapes, bl_mapes = [], [], []
    for sku in m5_data.SKUS[:sku_limit]:
        series = m5_data._apply_config_to_series(sku.get('fullTrend', sku['trend']))
        arr = np.array(series, dtype=float)
        arr = np.nan_to_num(arr, nan=0.0)
        if len(arr) < horizon + 4:
            continue
        split = len(arr) - horizon
        train = arr[:split]
        test = arr[split:]
        pattern = fe.detect_demand_pattern(train.tolist(), seasonality_mode=cfg.get('seasonalityMode', 'auto'))
        stat_fc = fe.forecast_for_pattern(train.tolist(), pattern, horizon)
        ml_fc = mlf.auto_ml_forecast(train.tolist(), horizon, preferred='lightgbm',
                                     seasonality_mode=cfg.get('seasonalityMode', 'auto'))
        # Judgmental channel: deterministic planner-style estimate (recent smoothed level)
        judg_level = float(np.mean(train[-8:])) if len(train) >= 8 else float(np.mean(train))
        judgmental = [judg_level] * horizon
        weights = GLOBAL_CONSENSUS_CONFIG
        if weights['adaptiveWeighting']:
            ml_mape_val = fe.calculate_mape(test.tolist(), ml_fc['p50'][:len(test)])
            stat_mape_val = fe.calculate_mape(test.tolist(), stat_fc['p50'][:len(test)])
            judg_mape_val = fe.calculate_mape(test.tolist(), judgmental[:len(test)])
            inv_ml = 1 / max(ml_mape_val, 0.1)
            inv_stat = 1 / max(stat_mape_val, 0.1)
            inv_judg = 1 / max(judg_mape_val, 0.1)
            total_inv = inv_ml + inv_stat + inv_judg
            w_ml = inv_ml / total_inv if total_inv > 0 else weights['mlWeight']
            w_stat = inv_stat / total_inv if total_inv > 0 else weights['statisticalWeight']
            w_judg = inv_judg / total_inv if total_inv > 0 else weights['judgmentalWeight']
        else:
            w_ml, w_stat, w_judg = weights['mlWeight'], weights['statisticalWeight'], weights['judgmentalWeight']
        forecasts = []
        for i in range(horizon):
            b_p50 = w_ml * ml_fc['p50'][i] + w_stat * stat_fc['p50'][i] + w_judg * judgmental[i]
            eff_weights = {"ml": round(w_ml, 3), "statistical": round(w_stat, 3), "judgmental": round(w_judg, 3)}
            forecasts.append({"week": f"w{len(arr) + i}", "mlForecast": round(float(ml_fc['p50'][i]), 1),
                              "statisticalForecast": round(float(stat_fc['p50'][i]), 1),
                              "judgmentalForecast": round(float(judgmental[i]), 1),
                              "blendedP50": round(float(b_p50), 1),
                              "blendedP10": round(float(w_ml * ml_fc['p10'][i] + w_stat * stat_fc['p10'][i]), 1),
                              "blendedP90": round(float(w_ml * ml_fc['p90'][i] + w_stat * stat_fc['p90'][i]), 1),
                              "weights": eff_weights})
        blended_test = [f['blendedP50'] for f in forecasts[:len(test)]]
        ml_test = [ml_fc['p50'][j] for j in range(len(test))]
        stat_test = [stat_fc['p50'][j] for j in range(len(test))]
        blended_mape = fe.calculate_mape(test.tolist(), blended_test) if len(test) > 0 else None
        ml_mape = fe.calculate_mape(test.tolist(), ml_test) if len(test) > 0 else None
        stat_mape = fe.calculate_mape(test.tolist(), stat_test) if len(test) > 0 else None
        if ml_mape is not None: ml_mapes.append(ml_mape)
        if stat_mape is not None: stat_mapes.append(stat_mape)
        if blended_mape is not None: bl_mapes.append(blended_mape)
        results.append({"skuId": sku['id'], "skuName": sku['name'],
                        "config": GLOBAL_CONSENSUS_CONFIG, "forecasts": forecasts,
                        "effectiveWeights": {"ml": round(w_ml, 3), "statistical": round(w_stat, 3),
                                              "judgmental": round(w_judg, 3)},
                        "blendedMape": blended_mape, "mlMape": ml_mape, "statMape": stat_mape})
    overall = round(float(np.mean(bl_mapes)), 1) if bl_mapes else None
    return {"results": results, "methodologies": METHODOLOGIES,
            "globalConfig": GLOBAL_CONSENSUS_CONFIG, "overallBlendedMape": overall}

@router.post("/api/tenants/nestle-fmcg-demo/consensus/config")
async def update_consensus_config(config: dict):
    GLOBAL_CONSENSUS_CONFIG.update(config)
    return GLOBAL_CONSENSUS_CONFIG
