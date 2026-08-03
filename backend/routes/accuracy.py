from fastapi import APIRouter
from models import AccuracyByCategory
from data.m5_data import get_categories, get_locations, get_accuracy_drift

router = APIRouter()

@router.get("/api/tenants/nestle-fmcg-demo/accuracy-by-category", response_model=list[AccuracyByCategory])
def get_accuracy_by_category():
    return get_categories()

@router.get("/api/tenants/nestle-fmcg-demo/accuracy-drift")
def get_accuracy_drift_route():
    """Return accuracy drift monitoring data (trend, degradation status)."""
    return get_accuracy_drift()

@router.get("/api/tenants/nestle-fmcg-demo/locations")
def get_locations_route():
    return get_locations()
