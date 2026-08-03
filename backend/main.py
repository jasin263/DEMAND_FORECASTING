"""
ForecastIQ Python Backend
FastAPI application serving the same endpoints as the Next.js API routes.
Designed to be more enterprise-ready with configuration-driven startup and structured health endpoints.
"""
import sys
import os
import logging
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from routes.kpi import router as kpi_router
from routes.accuracy import router as accuracy_router
from routes.forecast import router as forecast_router
from routes.exceptions import router as exceptions_router
from routes.skus import router as skus_router
from routes.scenarios import router as scenarios_router
from routes.data_sources import router as data_sources_router
from routes.configuration import router as configuration_router
from routes.export_packages import router as export_packages_router
from routes.model_analytics import router as model_analytics_router
from routes.backtest import router as backtest_router
from routes.onboarding import router as onboarding_router
from routes.hierarchy import router as hierarchy_router
from routes.promotions import router as promotions_router
from routes.backtesting import router as backtesting_router
from routes.seasonal_decomp import router as seasonal_decomp_router
from routes.simulations import router as simulations_router
from routes.demand_sensing import router as demand_sensing_router
from routes.inventory import router as inventory_router
from routes.external_factors import router as external_factors_router
from routes.collaboration import router as collaboration_router
from routes.consensus import router as consensus_router
from routes.generic_dataset import router as generic_dataset_router
from routes.maturity import router as maturity_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="ForecastIQ Backend API",
        description="Python backend serving forecast data for the ForecastIQ demand forecasting platform",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "type": "validation_error",
                    "message": "Request validation failed",
                    "details": exc.errors(),
                }
            },
        )

    @app.get("/api/health")
    async def health_check():
        return {
            "status": "healthy",
            "service": settings.app_name,
            "version": "1.0.0",
            "environment": settings.environment,
        }

    @app.get("/api/ready")
    async def readiness_check():
        return {"status": "ready", "service": settings.app_name, "environment": settings.environment}

    @app.on_event("startup")
    async def restore_uploaded_dataset():
        """Reuse the previously uploaded dataset after a container restart."""
        import generic_dataset as gd
        from data import m5_data
        try:
            if gd.restore_persisted_dataset():
                pending = gd.PENDING_USER_DATASET
                gd.load_user_dataset_into_m5(
                    pending['file_bytes'], pending['filename'], pending['mapping'])
                pending.clear()
                m5_data.recompute_forecast_timeseries()
                logging.getLogger("boot").info(
                    "Persisted uploaded dataset restored · %d SKUs", len(m5_data.SKUS))
        except Exception as exc:  # pragma: no cover - defensive path
            logging.getLogger("boot").warning("Could not restore persisted dataset: %s", exc)

    app.include_router(kpi_router)
    app.include_router(accuracy_router)
    app.include_router(forecast_router)
    app.include_router(exceptions_router)
    app.include_router(skus_router)
    app.include_router(scenarios_router)
    app.include_router(data_sources_router)
    app.include_router(configuration_router)
    app.include_router(export_packages_router)
    app.include_router(model_analytics_router)
    app.include_router(backtest_router)
    app.include_router(onboarding_router)
    app.include_router(hierarchy_router)
    app.include_router(promotions_router)
    app.include_router(backtesting_router)
    app.include_router(seasonal_decomp_router)
    app.include_router(simulations_router)
    app.include_router(demand_sensing_router)
    app.include_router(inventory_router)
    app.include_router(external_factors_router)
    app.include_router(collaboration_router)
    app.include_router(consensus_router)
    app.include_router(generic_dataset_router)
    app.include_router(maturity_router)

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port, log_level="info")
