from fastapi import APIRouter
from models import KPISummary
from data import m5_data

router = APIRouter()

@router.get("/api/tenants/nestle-fmcg-demo/kpi-summary", response_model=KPISummary)
def get_kpi_summary():
    return m5_data.get_kpi_summary()