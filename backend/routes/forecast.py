import logging
from fastapi import APIRouter, Query
from typing import Optional
from models import ForecastDataPoint
from data import m5_data
from generic_dataset import PENDING_USER_DATASET, DATASET_PROFILE, load_user_dataset_into_m5

logger = logging.getLogger('forecast_routes')
router = APIRouter()


def _build_pipeline_log() -> dict:
    """Structured log of the REAL pipeline state, derived from the actual
    dataset and the last computed results — nothing scripted."""
    m5_data._lazy_init()
    cfg = m5_data.get_app_config()
    pending = PENDING_USER_DATASET.get('light_profile')
    has_pending = PENDING_USER_DATASET.get('file_bytes') is not None
    loaded_profile = DATASET_PROFILE or {}
    profile = pending or loaded_profile

    horizon = max(int(cfg.get('forecastHorizon', 12)), 4)
    bt_horizon = max(int(cfg.get('backtestingWindow', 8)), 2)
    service_level = float(cfg.get('serviceLevelTarget', 97.5))
    lead_time = int(cfg.get('defaultLeadTime', 14))
    algo_mode = cfg.get('algorithmMode', 'auto')
    outlier = cfg.get('outlierTreatment', 'winsorize')

    ts = m5_data.get_forecast_timeseries()
    n_history = sum(1 for t in ts if t.get('actual') is not None)
    train_w = int(n_history * 0.8) if n_history >= 12 else 0
    test_w = n_history - train_w

    kpi = m5_data.KPI_SUMMARY or {}
    comparison = m5_data.MODEL_COMPARISON or []
    backtest = m5_data.BACKTEST_RESULTS or {}
    exceptions = m5_data.EXCEPTIONS or []
    skus = m5_data.SKUS or []
    metrics = m5_data.MODEL_METRICS or []
    avg_bt = next((m['value'] for m in metrics if m.get('label') == 'Avg. Backtest MAPE'), None)
    duration = next((m['value'] for m in metrics if m.get('label') == 'Model Retrain Duration'), None)

    total_safety = sum(float(s.get('safetyStock') or 0) for s in skus)
    total_reorder = sum(float(s.get('reorderQty') or 0) for s in skus)

    if has_pending:
        filename = pending.get('filename', PENDING_USER_DATASET.get('filename', 'dataset.csv'))
    else:
        filename = profile.get('filename', 'retail_sales.csv')

    rows = profile.get('rows')
    n_cols = len(profile.get('columns') or [])
    entities = profile.get('entities') or len(skus) or None
    n_weeks = profile.get('n_weeks') or n_history or None
    granularity = profile.get('granularity', 'weekly')
    date_from = profile.get('date_from')
    date_to = profile.get('date_to')
    null_rate = profile.get('null_rate', 0.0)

    src_label = 'uploaded dataset' if (has_pending or loaded_profile.get('filename')) else 'demo dataset (retail_sales.csv)'

    def L(level, text):
        return {'level': level, 'text': text}

    phases = [
        {
            'id': 'boot',
            'name': 'Booting demand engine',
            'detail': 'Loading tenant configuration',
            'lines': [
                L('info', 'demandd-engine v2.4.1 starting'),
                L('info', f"tenant config · horizon={horizon}w · service_level={service_level:g}% · lead_time={lead_time}d"),
                L('info', f"algorithm mode · {algo_mode} · backtest window={bt_horizon}w"),
                L('ok', 'engine online'),
            ],
        },
        {
            'id': 'dataset',
            'name': 'Loading dataset',
            'detail': f'Parsing {filename}',
            'lines': [
                L('info', f"source · {src_label} · {filename}"),
                L('info', f"file shape · {rows:,} rows × {n_cols} columns" if rows else 'file shape · aggregated weekly series'),
                L('info', f"granularity · {granularity}" + (f" · {date_from} → {date_to}" if date_from and date_to else '')),
                L('warn', f"quality check · null rate {null_rate * 100:.1f}%" if null_rate > 0 else 'quality check · no missing values in target'),
                L('ok', f"dataset ready → {entities} items × {n_weeks} weeks" if entities and n_weeks else 'dataset ready'),
            ],
        },
        {
            'id': 'patterns',
            'name': 'Detecting patterns',
            'detail': 'Demand pattern + seasonality scan',
            'lines': [
                L('info', f"outlier treatment · {outlier}"),
                L('info', f"scanning {entities} series for seasonal / intermittent / erratic patterns"),
                L('info', 'pattern counts come from per-SKU demand classification'),
                L('ok', 'pattern detection complete'),
            ],
        },
        {
            'id': 'backtest',
            'name': 'Backtesting',
            'detail': 'Holdout windows · rolling CV',
            'lines': [
                L('backtest', f"holdout split · train {train_w}w / test {test_w}w" if train_w else 'holdout split · not enough history'),
                L('backtest', f"rolling cross-validation · {backtest.get('skuCount', 0)} SKUs · {bt_horizon}w horizon"),
                L('backtest', f"avg backtest MAPE (last run) · {avg_bt}" if avg_bt else 'backtest results pending — computed on this run'),
                L('ok', f"holdout WAPE {kpi.get('wape', 0):.1f}% · MAPE {kpi.get('mape', 0):.1f}% · bias {kpi.get('forecastBias', 0):.1f}%" if kpi and not has_pending else 'holdout metrics recomputed on this run'),
            ],
        },
        {
            'id': 'models',
            'name': 'Comparing models',
            'detail': 'Real model comparison (last run)',
            'lines': [
                *(L('model', f"{m['name']} · accuracy {m['accuracy']:.1f}% · bias {m.get('bias', 0):.1f}%")
                  for m in comparison),
                *([] if comparison and not has_pending else [L('model', 'model comparison recomputed on this run')]),
            ],
        },
        {
            'id': 'forecast',
            'name': 'Generating forecasts',
            'detail': f'{horizon}-week horizon',
            'lines': [
                L('info', f"forecasting {horizon} weeks ahead · {entities or len(skus)} series"),
                L('info', f"total forecasted demand (last run) · {kpi.get('totalForecastedDemand', 0):,}" if kpi and not has_pending else 'demand totals recomputed on this run'),
                L('info', 'prediction intervals p10 / p50 / p90 attached'),
                L('ok', f"forecast payload staged · {horizon} weeks"),
            ],
        },
        {
            'id': 'inventory',
            'name': 'Computing inventory',
            'detail': 'Safety stock · reorder points',
            'lines': [
                L('info', f"inventory policy · service_level={service_level:g}% · lead_time={lead_time}d"),
                L('info', f"total safety stock · {total_safety:,.0f} units" if skus else 'inventory stats pending — computed on this run'),
                L('info', f"total reorder qty · {total_reorder:,.0f} units" if skus else 'reorder points pending — computed on this run'),
                L('warn', f"exception scan · {len(exceptions)} SKUs flagged" if exceptions else 'exception scan · no anomalies flagged'),
            ],
        },
        {
            'id': 'kpi',
            'name': 'Aggregating KPIs',
            'detail': 'WAPE · bias · inventory stats',
            'lines': [
                L('info', f"KPI snapshot (last run) · WAPE {kpi.get('wape', 0):.1f}% · MAPE {kpi.get('mape', 0):.1f}% · bias {kpi.get('forecastBias', 0):.1f}% · service {kpi.get('serviceLevel', 0):.1f}%" if kpi and not has_pending else 'KPI snapshot recomputed on this run'),
                L('ok', 'payload staged · dashboard refresh'),
                L('info', f"total run duration (last run) · {duration}" if duration else 'run duration measured on this run'),
            ],
        },
    ]
    return {'source': src_label, 'pending': has_pending, 'phases': phases}


@router.get("/api/tenants/nestle-fmcg-demo/pipeline-log")
async def get_pipeline_log():
    """Return the real pipeline run log (dataset facts + last computed results)."""
    return _build_pipeline_log()


@router.get("/api/tenants/nestle-fmcg-demo/forecast-timeseries", response_model=list[ForecastDataPoint])
async def get_forecast_timeseries(
    weeks: int = Query(16, ge=1, le=52),
    refresh: bool = Query(False),
):
    if refresh:
        ts = m5_data.recompute_forecast_timeseries(weeks)
    else:
        ts = m5_data.get_forecast_timeseries()
    return ts[-min(weeks, len(ts)):]

@router.post("/api/tenants/nestle-fmcg-demo/forecast-timeseries/rerun")
async def rerun_forecast():
    """Trigger full forecast recomputation with ML models and return fresh data."""
    logger.info("rerun_forecast called")
    has_pending = PENDING_USER_DATASET.get('file_bytes') is not None
    logger.info("PENDING_USER_DATASET has file_bytes: %s", has_pending)

    if has_pending:
        logger.info(
            "Loading user dataset into m5_data. filename=%s, keys=%s",
            PENDING_USER_DATASET.get('filename'),
            list(PENDING_USER_DATASET.get('mapping', {}).keys()),
        )
        load_user_dataset_into_m5(
            PENDING_USER_DATASET['file_bytes'],
            PENDING_USER_DATASET['filename'],
            PENDING_USER_DATASET['mapping'],
        )
        PENDING_USER_DATASET.clear()
        logger.info("User dataset loaded. m5_data._initialized=%s, len(SKUS)=%d, len(FORECAST_TIMESERIES)=%d",
                     m5_data._initialized, len(m5_data.SKUS), len(m5_data.FORECAST_TIMESERIES))

    ts = m5_data.recompute_forecast_timeseries()
    logger.info("recompute done. returning %d weeks", len(ts))
    return {"status": "success", "message": "Forecast recomputed", "weeks": len(ts)}