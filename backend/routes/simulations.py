"""3. What-if simulation engine — recompute forecast with adjusted parameters.

How each parameter affects the forecast:
- promo_lift_pct:  Multiplies forecast output by (1 + lift/100).
                   A 20% promo lift means predicted demand is 20% higher.
- price_change_pct: Applies price elasticity (default -1.5).
                    A -15% price change → +22.5% demand via elasticity.
- demand_shift_pct: Scales the entire input series by (1 + shift/100).
                    A -30% supply disruption means all sales history is
                    treated as 30% lower = permanently lower demand level.
"""
import logging
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
import numpy as np
from data import m5_data
import forecast_engine as fe

logger = logging.getLogger(__name__)
router = APIRouter()

SIMULATIONS = {}
PRICE_ELASTICITY = -1.5

AVAILABLE_PARAMS = [
    {"name": "promo_lift_pct", "type": "percent", "default": 0.0, "min": -50, "max": 200},
    {"name": "price_change_pct", "type": "percent", "default": 0.0, "min": -50, "max": 100},
    {"name": "demand_shift_pct", "type": "percent", "default": 0.0, "min": -80, "max": 300},
    {"name": "service_level_target", "type": "percent", "default": 97.5, "min": 80, "max": 99.9},
    {"name": "lead_time_days", "type": "select", "default": 14, "options": ["7", "14", "21", "30", "45", "60"]},
]

PRESETS = [
    {"id": "promo-lift-20", "name": "20% Promo Lift", "description": "20% demand uplift from promotion with 10% price cut", "parameters": {"promo_lift_pct": 20, "price_change_pct": -10}},
    {"id": "price-cut-15", "name": "15% Price Cut", "description": "15% permanent price reduction drives ~22% more demand", "parameters": {"price_change_pct": -15, "demand_shift_pct": 8}},
    {"id": "supply-disruption", "name": "Supply Disruption", "description": "30% demand suppression from supply chain issue", "parameters": {"demand_shift_pct": -30}},
    {"id": "aggressive-growth", "name": "Aggressive Growth", "description": "50% promo boost + 30% demand growth from campaign", "parameters": {"promo_lift_pct": 50, "demand_shift_pct": 30}},
]


@router.get("/api/tenants/nestle-fmcg-demo/simulations")
async def list_simulations():
    return {"simulations": list(SIMULATIONS.values()), "presets": PRESETS, "availableParams": AVAILABLE_PARAMS}


@router.post("/api/tenants/nestle-fmcg-demo/simulations")
async def create_simulation(input_data: dict):
    name = input_data.get("name", "Unnamed Simulation")
    description = input_data.get("description", "")
    sku_ids = input_data.get("skuIds", [])
    params = input_data.get("parameters", {})
    sim_id = str(uuid.uuid4())[:8]

    promo_lift = float(params.get("promo_lift_pct", 0))
    price_change = float(params.get("price_change_pct", 0))
    demand_shift = float(params.get("demand_shift_pct", 0))

    m5_data._lazy_init()
    skus = [s for s in m5_data.SKUS if not sku_ids or s['id'] in sku_ids]
    if not skus:
        skus = m5_data.SKUS[:20]

    agg_baseline = 0.0
    agg_simulated = 0.0
    series_out = []

    for sku in skus:
        series = sku.get('fullTrend', sku['trend'])
        if len(series) < 8:
            continue
        arr = np.array(series, dtype=float)
        arr = np.nan_to_num(arr, nan=0.0)
        pattern = fe.detect_demand_pattern(arr.tolist())

        # 1. Baseline forecast (no adjustments)
        baseline_fc = fe.forecast_for_pattern(arr.tolist(), pattern, 12)
        baseline_p50 = np.array(baseline_fc['p50'])

        # 2. Build simulated forecast
        #    a) Demand shift: scale the entire input series
        if demand_shift != 0:
            sim_input = arr * (1 + demand_shift / 100)
        else:
            sim_input = arr.copy()

        #    b) Run forecast on shifted input
        sim_fc = fe.forecast_for_pattern(sim_input.tolist(), pattern, 12)
        sim_p50 = np.array(sim_fc['p50'])

        #    c) Apply price elasticity: price_change% * elasticity = demand change%
        if price_change != 0:
            elasticity_effect = 1 + (price_change / 100) * PRICE_ELASTICITY
            sim_p50 = sim_p50 * elasticity_effect

        #    d) Apply promo lift: multiplicative boost to forecast output
        if promo_lift != 0:
            sim_p50 = sim_p50 * (1 + promo_lift / 100)

        sim_p50 = np.maximum(sim_p50, 0)

        # 3. Build output series
        weeks = [f"w{i}" for i in range(12)]
        for i in range(12):
            series_out.append({
                "week": weeks[i],
                "baseline": round(float(baseline_p50[i]), 1),
                "simulated": round(float(sim_p50[i]), 1),
            })

        agg_baseline += float(np.sum(baseline_p50))
        agg_simulated += float(np.sum(sim_p50))

    impact_pct = round((agg_simulated - agg_baseline) / max(agg_baseline, 1) * 100, 1)

    result = {
        "id": sim_id,
        "name": name,
        "description": description,
        "status": "completed",
        "created": datetime.now(timezone.utc).isoformat(),
        "completed": datetime.now(timezone.utc).isoformat(),
        "impact": {
            "totalBaseline": round(agg_baseline, 0),
            "totalSimulated": round(agg_simulated, 0),
            "impactPct": impact_pct,
            "skuCount": len(skus),
        },
        "series": series_out[:120],
        "parameters": {**params, "skuCount": len(skus)},
    }
    SIMULATIONS[sim_id] = result
    return result


@router.get("/api/tenants/nestle-fmcg-demo/simulations/{sim_id}")
async def get_simulation(sim_id: str):
    sim = SIMULATIONS.get(sim_id)
    if not sim:
        raise HTTPException(404, "Simulation not found")
    return sim


@router.delete("/api/tenants/nestle-fmcg-demo/simulations/{sim_id}")
async def delete_simulation(sim_id: str):
    SIMULATIONS.pop(sim_id, None)
    return {"status": "deleted"}
