from fastapi import APIRouter
from models import BacktestResult, AppConfig
from data import m5_data
from datetime import datetime, timezone

router = APIRouter()

@router.get("/api/tenants/nestle-fmcg-demo/backtest-results", response_model=BacktestResult)
async def get_backtest_results():
    return m5_data.get_backtest_results()

@router.post("/api/tenants/nestle-fmcg-demo/backtest/run")
async def run_backtest():
    """Trigger a fresh backtest run across all SKUs."""
    ts = m5_data.recompute_forecast_timeseries()
    backtest = m5_data.get_backtest_results()
    return {
        "status": "success",
        "message": "Backtest completed",
        "skuCount": backtest.get("skuCount", 0),
        "duration": backtest.get("duration", "N/A"),
        "mape": backtest.get("mape", 0),
    }