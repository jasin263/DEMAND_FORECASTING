from fastapi import APIRouter
from data import m5_data

router = APIRouter()

@router.get("/api/tenants/nestle-fmcg-demo/hierarchy")
async def get_hierarchy():
    """Return bottom-up reconciled forecasts across categories and SKUs."""
    return m5_data.get_hierarchical_forecast()
