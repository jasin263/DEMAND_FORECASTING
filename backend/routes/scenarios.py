from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from models import Scenario

router = APIRouter()

SCENARIOS_STORE = [
    {"id": "sc-001", "title": "Price Reduction on Beverages", "detail": "Reduce Nescafé and Milo prices by 12% for 4 weeks to counter competitor promotion", "impact": "Expected +18% volume uplift across beverage category", "status": "active", "createdAt": "2026-07-01T08:00:00Z"},
    {"id": "sc-002", "title": "Safety Stock Increase: Snacks", "detail": "Raise safety stock from 8 to 14 days for Kurkure and Lay's ahead of festive season", "impact": "Service level projected to increase from 89% to 96%", "status": "active", "createdAt": "2026-06-28T10:30:00Z"},
    {"id": "sc-003", "title": "Supplier Lead Time Reduction", "detail": "Negotiate lead time reduction from 14 to 10 days with top 3 suppliers", "impact": "Reduces safety stock requirement by 22% across 47 SKUs", "status": "draft", "createdAt": "2026-07-15T14:00:00Z"},
    {"id": "sc-004", "title": "Discontinue Low-Margin SKUs", "detail": "Phase out 12 underperforming SKUs with margin <8% and forecast error >40%", "impact": "Frees 15% warehouse capacity, improves forecast accuracy by 3.2 pts", "status": "draft", "createdAt": "2026-07-10T09:15:00Z"},
    {"id": "sc-005", "title": "Holiday Promotion Calendar", "detail": "Align 8 promotional events with Independence Day, Diwali, and Christmas demand peaks", "impact": "Projected 24% revenue lift during promotional periods", "status": "active", "createdAt": "2026-06-20T11:00:00Z"},
    {"id": "sc-006", "title": "Warehouse Slotting Optimization", "detail": "Reorganize A/B/C slotting based on forecast velocity for top 20% of SKUs", "impact": "Picking efficiency +12%, reduces overtime by 8 hrs/week", "status": "draft", "createdAt": "2026-07-18T16:30:00Z"},
    {"id": "sc-007", "title": "AI Model Refresh to LightGBM", "detail": "Switch from ETS to LightGBM for seasonal SKUs with >2 years of history", "impact": "Expected MAPE reduction from 14% to 9.5% for 32 seasonal SKUs", "status": "active", "createdAt": "2026-07-05T07:45:00Z"},
    {"id": "sc-008", "title": "Cross-Docking: High-Velocity SKUs", "detail": "Implement cross-docking for top 10 SKUs by volume to reduce dwell time", "impact": "Reduces holding cost by 18% for high-velocity items", "status": "archived", "createdAt": "2026-05-12T13:00:00Z"},
    {"id": "sc-009", "title": "Regional Demand Sensing", "detail": "Deploy store-level POS data integration for CA and TX locations", "impact": "Improves weekly forecast accuracy by 5-7% at state level", "status": "draft", "createdAt": "2026-07-22T10:00:00Z"},
    {"id": "sc-010", "title": "Promotion Pass-Through Optimization", "detail": "Optimize trade promotion spend by identifying SKUs with highest price elasticity", "impact": "15% improvement in promo ROI across 200+ SKUs", "status": "draft", "createdAt": "2026-07-20T09:30:00Z"},
    {"id": "sc-011", "title": "Service Level Policy Adjustment", "detail": "Adjust service level targets from 97.5% to 95% for low-margin categories", "impact": "Reduces safety stock cost by 11% without affecting revenue", "status": "draft", "createdAt": "2026-07-19T14:00:00Z"},
    {"id": "sc-012", "title": "Multi-Echelon Inventory Review", "detail": "Review DC-to-store inventory policies for Household category", "impact": "Projected 9% reduction in total system inventory", "status": "draft", "createdAt": "2026-07-17T11:00:00Z"},
]


@router.get("/api/tenants/nestle-fmcg-demo/scenarios", response_model=list[Scenario])
async def get_scenarios():
    return list(SCENARIOS_STORE)


@router.post("/api/tenants/nestle-fmcg-demo/scenarios", response_model=Scenario)
async def create_scenario(body: Scenario):
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
async def update_scenario(scenario_id: str, body: Scenario):
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
async def delete_scenario(scenario_id: str):
    for i, s in enumerate(SCENARIOS_STORE):
        if s["id"] == scenario_id:
            SCENARIOS_STORE.pop(i)
            return {"status": "success", "message": "Scenario deleted"}
    raise HTTPException(status_code=404, detail="Scenario not found")
