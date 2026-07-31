"""1. Walk-forward backtesting with rolling window splits."""
import logging
import numpy as np
from datetime import datetime, timezone
from fastapi import APIRouter, Query
from data import m5_data
import forecast_engine as fe

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/api/tenants/nestle-fmcg-demo/backtesting/walk-forward")
async def get_walk_forward(
    horizon: int = Query(8, ge=2, le=26),
    n_splits: int = Query(5, ge=2, le=20),
    sku_limit: int = Query(50, ge=1, le=100),
):
    m5_data._lazy_init()
    results = []
    for sku in m5_data.SKUS[:sku_limit]:
        series = sku.get('fullTrend', sku['trend'])
        raw = np.array(series, dtype=float)
        raw = np.nan_to_num(raw, nan=0.0)
        if len(raw) < horizon + n_splits + 4:
            continue
        results.append(_compute_walk_forward(raw, sku, horizon, n_splits))
    return {"results": results, "horizon": horizon, "nSplits": n_splits,
            "method": "walk-forward", "generatedAt": datetime.now(timezone.utc).isoformat()}

def _compute_walk_forward(arr: np.ndarray, sku: dict, horizon: int, n_splits: int) -> dict:
    n = len(arr)
    step = max((n - horizon) // n_splits, 1)
    folds = []
    mape_list, wape_list, bias_list, cov_list = [], [], [], []

    for i in range(n_splits):
        test_end = n - (n_splits - 1 - i) * step
        test_start = test_end - horizon
        train_end = test_start
        train_start = 0

        if test_start < 4 or test_end > n or train_end - train_start < 4:
            continue

        train = arr[train_start:train_end]
        test = arr[test_start:test_end]

        pattern = fe.detect_demand_pattern(train.tolist())
        fc = fe.forecast_for_pattern(train.tolist(), pattern, horizon)[
            'p50'
        ]

        m = fe.calculate_mape(test.tolist(), fc)
        w = fe.calculate_wape(test.tolist(), fc)
        b = fe.calculate_bias(test.tolist(), fc)

        residuals = np.abs(test - np.array(fc[:len(test)]))
        std_r = float(np.std(residuals)) if len(residuals) > 1 else float(np.mean(np.abs(test))) * 0.1
        lo = np.array(fc[:len(test)]) - 1.96 * std_r
        hi = np.array(fc[:len(test)]) + 1.96 * std_r
        in_interval = np.sum((test >= lo) & (test <= hi))
        c = float(in_interval) / len(test) * 100 if len(test) > 0 else 0.0

        folds.append({
            "fold": i + 1,
            "trainStart": f"w{train_start}",
            "trainEnd": f"w{train_end}",
            "testStart": f"w{test_start}",
            "testEnd": f"w{test_end}",
            "trainSize": len(train),
            "testSize": len(test),
            "mape": m,
            "wape": w,
            "bias": b,
            "coverage": round(c, 1),
        })
        mape_list.append(m)
        wape_list.append(w)
        bias_list.append(b)
        cov_list.append(c)

    if not folds:
        return {"skuId": sku['id'], "skuName": sku['name'], "folds": [],
                "avgMape": 0, "avgWape": 0, "avgBias": 0, "avgCoverage": 0, "stabilityScore": 0}

    avg_m = float(np.mean(mape_list))
    avg_w = float(np.mean(wape_list))
    avg_b = float(np.mean(bias_list))
    avg_c = float(np.mean(cov_list))
    std_m = float(np.std(mape_list)) if len(mape_list) > 1 else 0.0
    cv_m = std_m / max(avg_m, 0.01)
    stability = round(max(0, min(100, 100 - cv_m * 50)), 1)

    return {
        "skuId": sku['id'],
        "skuName": sku['name'],
        "folds": folds,
        "avgMape": round(avg_m, 1),
        "avgWape": round(avg_w, 1),
        "avgBias": round(avg_b, 1),
        "avgCoverage": round(avg_c, 1),
        "stabilityScore": stability,
    }
