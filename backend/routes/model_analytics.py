from fastapi import APIRouter
from models import ModelAnalytics
from data import m5_data

router = APIRouter()

@router.get("/api/tenants/nestle-fmcg-demo/model-analytics", response_model=ModelAnalytics)
def get_model_analytics():
    return {"metrics": m5_data.get_model_metrics(), "comparison": m5_data.get_model_comparison()}