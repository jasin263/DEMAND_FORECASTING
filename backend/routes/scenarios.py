from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import numpy as np
from models import Scenario
from data import m5_data
from generic_dataset import DATASET_PROFILE
import forecast_engine as fe

router = APIRouter()

# Seeded with real computed impacts on first GET; user-created scenarios
# continue to be managed through the create/update/delete endpoints.
SCENARIOS_STORE: list[dict] = []
_SCENARIOS_SEEDED = False

# Same elasticity constant as the simulation engine
PRICE_ELASTICITY = -1.5

SCENARIO_PRESETS = [
    {
        "id": "sc-001", "title": "20% Promo Lift with 10% Price Cut",
        "detail": "Promo campaign boosting forecast output by 20% with a 10% price cut. Impact is recomputed by rerunning the forecast model on the real demand series.",
        "status": "draft",
        "params": {"promo_lift_pct": 20, "price_change_pct": -10},
    },
    {
        "id": "sc-002", "title": "15% Price Cut (elasticity −1.5)",
        "detail": "Permanent 15% price reduction plus 8% underlying demand growth, modeled with the same elasticity constant as the simulation engine.",
        "status": "draft",
        "params": {"price_change_pct": -15, "demand_shift_pct": 8},
    },
    {
        "id": "sc-003", "title": "Supply Disruption: −30% Demand",
        "detail": "30% demand suppression from a supply chain event — the input history is scaled down and the forecast refit on it.",
        "status": "draft",
        "params": {"demand_shift_pct": -30},
    },
    {
        "id": "sc-004", "title": "Aggressive Growth Campaign",
        "detail": "50% promo boost plus 30% demand growth from a launch campaign.",
        "status": "draft",
        "params": {"promo_lift_pct": 50, "demand_shift_pct": 30},
    },
    {
        "id": "sc-005", "title": "Service Level 95% (from 97.5%)",
        "detail": "Relax the service level target and measure the real safety-stock change across all SKUs.",
        "status": "draft",
        "params": {"service_level_target": 95.0},
    },
    {
        "id": "sc-006", "title": "Lead Time 7 Days (from 14)",
        "detail": "Supplier lead-time negotiation — recomputes the reorder quantity and safety stock for every SKU.",
        "status": "draft",
        "params": {"lead_time_days": 7},
    },
]


def _aggregate_series() -> list[float]:
    m5_data._lazy_init()
    return [ts['actual'] for ts in m5_data.FORECAST_TIMESERIES if ts['actual'] is not None]


def _forecast_demand_sum(series: list[float], params: dict) -> float | None:
    """12-week forecast demand total for the aggregate series under a parameter set."""
    arr = np.array(series, dtype=float)
    arr = np.nan_to_num(arr, nan=0.0)
    if len(arr) < 12:
        return None
    pattern = fe.detect_demand_pattern(arr.tolist())
    demand_shift = float(params.get('demand_shift_pct', 0))
    promo_lift = float(params.get('promo_lift_pct', 0))
    price_change = float(params.get('price_change_pct', 0))
    if demand_shift:
        arr = arr * (1 + demand_shift / 100)
    fc = fe.forecast_for_pattern(arr.tolist(), pattern, 12)
    p50 = np.array(fc['p50'])
    if price_change:
        p50 = p50 * (1 + (price_change / 100) * PRICE_ELASTICITY)
    if promo_lift:
        p50 = p50 * (1 + promo_lift / 100)
    return float(np.sum(np.maximum(p50, 0)))


def _inventory_totals(service_level_target: float | None = None,
                      lead_time_days: int | None = None) -> tuple[float, float]:
    """(safety_stock_sum, reorder_qty_sum) across all SKUs under the given policy."""
    m5_data._lazy_init()
    cfg = m5_data.get_app_config()
    sl = service_level_target if service_level_target is not None else float(cfg.get('serviceLevelTarget', 97.5))
    lt = lead_time_days if lead_time_days is not None else max(int(cfg.get('defaultLeadTime', 14)), 1)
    safety_total = 0.0
    reorder_total = 0.0
    for sku in m5_data.SKUS:
        series = sku.get('fullTrend', sku['trend'])
        if not series:
            continue
        stats = fe.compute_inventory_stats(series, lead_time_days=lt, service_level_target=sl)
        safety_total += stats.get('safetyStock', 0)
        reorder_total += stats.get('reorderQty', 0)
    return safety_total, reorder_total


def _seed_scenarios():
    global _SCENARIOS_SEEDED
    if _SCENARIOS_SEEDED:
        return
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    series = _aggregate_series()
    baseline = _forecast_demand_sum(series, {}) if len(series) >= 12 else None

    for preset in SCENARIO_PRESETS:
        if preset['id'] == 'sc-005':
            safety_base, _ = _inventory_totals()
            safety_new, _ = _inventory_totals(service_level_target=95.0)
            pct = (safety_new - safety_base) / max(safety_base, 1) * 100
            impact = (
                f"Safety stock across all SKUs changes by {pct:+.1f}% "
                f"({safety_base:,.0f} → {safety_new:,.0f} units) at a 95% service level"
            )
        elif preset['id'] == 'sc-006':
            _, reorder_base = _inventory_totals()
            _, reorder_new = _inventory_totals(lead_time_days=7)
            pct = (reorder_new - reorder_base) / max(reorder_base, 1) * 100
            impact = (
                f"Reorder quantity across all SKUs changes by {pct:+.1f}% "
                f"({reorder_base:,.0f} → {reorder_new:,.0f} units) at a 7-day lead time"
            )
        elif baseline is not None:
            sim = _forecast_demand_sum(series, preset['params'])
            pct = (sim - baseline) / max(baseline, 1) * 100
            impact = (
                f"12-week forecast demand changes by {pct:+.1f}% "
                f"({baseline:,.0f} → {sim:,.0f} units)"
            )
        else:
            impact = 'Insufficient history to compute impact'
        SCENARIOS_STORE.append({**preset, 'impact': impact, 'createdAt': now})
    _SCENARIOS_SEEDED = True


@router.get("/api/tenants/nestle-fmcg-demo/scenarios", response_model=list[Scenario])
def get_scenarios():
    _seed_scenarios()
    return list(SCENARIOS_STORE)


@router.post("/api/tenants/nestle-fmcg-demo/scenarios", response_model=Scenario)
def create_scenario(body: Scenario):
    new_id = f"sc-{len(SCENARIOS_STORE) + 1:03d}"
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    entry = {
        "id": new_id,
        "title": body.title,
        "detail": body.detail,
        "impact": body.impact,
        "status": body.status if hasattr(body, 'status') else 'draft',
        "createdAt": now,
    }
    SCENARIOS_STORE.append(entry)
    return entry


@router.put("/api/tenants/nestle-fmcg-demo/scenarios/{scenario_id}", response_model=Scenario)
def update_scenario(scenario_id: str, body: Scenario):
    for i, s in enumerate(SCENARIOS_STORE):
        if s["id"] == scenario_id:
            SCENARIOS_STORE[i] = {
                "id": scenario_id,
                "title": body.title,
                "detail": body.detail,
                "impact": body.impact,
                "status": body.status,
                "createdAt": s.get("createdAt", datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')),
            }
            return SCENARIOS_STORE[i]
    raise HTTPException(status_code=404, detail="Scenario not found")


@router.delete("/api/tenants/nestle-fmcg-demo/scenarios/{scenario_id}")
def delete_scenario(scenario_id: str):
    for i, s in enumerate(SCENARIOS_STORE):
        if s["id"] == scenario_id:
            SCENARIOS_STORE.pop(i)
            return {"status": "success", "message": "Scenario deleted"}
    raise HTTPException(status_code=404, detail="Scenario not found")
