"""5. Inventory optimization — safety stock, reorder point, EOQ, service level."""
import logging
from math import sqrt, exp, pi, erf
from fastapi import APIRouter, Query
import numpy as np
from data import m5_data

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/api/tenants/nestle-fmcg-demo/inventory/optimization")
async def get_inventory_optimization(
    sku_limit: int = Query(50, ge=1, le=100),
    service_level: float = Query(0.975, ge=0.8, le=0.999),
    lead_time_days: int = Query(14, ge=1, le=90),
    holding_cost_pct: float = Query(0.25, ge=0.05, le=0.5),
    order_cost: float = Query(50, ge=5, le=500),
):
    m5_data._lazy_init()
    results = []
    for sku in m5_data.SKUS[:sku_limit]:
        series = sku.get('fullTrend', sku['trend'])
        arr = np.array(series, dtype=float)
        arr = np.nan_to_num(arr, nan=0.0)
        if len(arr) < 8:
            continue
        avg_daily = float(np.mean(arr)) / 7.0
        demand_std = float(np.std(arr)) / sqrt(7.0) if len(arr) > 1 else avg_daily * 0.3
        z = _norm_ppf(service_level)
        lt_std = lead_time_days * 0.2
        safety = round(z * sqrt(lead_time_days * demand_std**2 + avg_daily**2 * lt_std**2), 1)
        reorder = round(avg_daily * lead_time_days + safety, 1)
        eoq = round(sqrt(2 * avg_daily * 365 * order_cost / (holding_cost_pct * (sku.get('sellPrice', 10) or 10))), 1)
        target = round(reorder + eoq * 0.5, 1)
        fill_rate = _fill_rate(service_level, z)
        stockout_prob = round((1 - service_level) * 100, 1)
        holding = round(safety * (sku.get('sellPrice', 10) or 10) * holding_cost_pct, 1)
        results.append({"skuId": sku['id'], "skuName": sku['name'],
                        "category": sku.get('category', 'General'),
                        "reorderPoint": reorder, "safetyStock": safety,
                        "economicOrderQty": eoq, "targetStock": target,
                        "avgDemandPerDay": round(avg_daily, 2),
                        "demandStd": round(demand_std, 2),
                        "leadTimeDays": lead_time_days, "serviceLevel": service_level,
                        "projectedFillRate": round(fill_rate, 1),
                        "stockoutProbability": stockout_prob,
                        "annualHoldingCost": holding})
    total_safety = round(sum(r['safetyStock'] for r in results), 1) if results else 0
    avg_sl = round(float(np.mean([r['serviceLevel'] for r in results])), 3) if results else 0
    total_holding = round(sum(r['annualHoldingCost'] for r in results), 1) if results else 0
    return {"skus": results, "totalSafetyStock": total_safety,
            "avgServiceLevel": avg_sl, "totalAnnualHoldingCost": total_holding}

def _norm_ppf(p):
    return sqrt(2) * _erfinv(2 * p - 1)

def _erfinv(x):
    t = x
    for _ in range(5):
        t = t - (erf(t) - x) / (2 / sqrt(pi) * exp(-t*t))
    return t * 0.9

def _fill_rate(sl, z):
    if z > 3.5: return 99.9
    if z > 2.5: return 99.5
    if z > 2.0: return 98.0
    if z > 1.5: return 95.0
    return sl * 100
