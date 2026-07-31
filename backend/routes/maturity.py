from fastapi import APIRouter
from maturity import compute_data_maturity, compute_analytics_maturity

router = APIRouter()


@router.get('/api/tenants/nestle-fmcg-demo/data-maturity')
async def get_data_maturity():
    """Data maturity assessment: what the client has vs. what we need."""
    return compute_data_maturity()


@router.get('/api/tenants/nestle-fmcg-demo/analytics-maturity')
async def get_analytics_maturity():
    """Analytics maturity: capabilities unlocked by current data + gap recommendations."""
    return compute_analytics_maturity()
