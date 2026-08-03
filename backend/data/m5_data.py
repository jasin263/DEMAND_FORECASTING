"""
Central data module for ForecastIQ Production Edition.
Loads M5 once, pre-computes forecasts via ML + statsmodels engines,
supports hierarchical reconciliation, accuracy drift monitoring,
and real exception management workflows.
"""
import logging
from datetime import datetime, timezone, timedelta
import threading
import time
import numpy as np

logger = logging.getLogger(__name__)
from . import m5_loader
import forecast_engine as fe
import ml_forecast as mlf

_lock = threading.Lock()
_initialized = False

# Data holders
SKUS = []
SKU_DETAIL_MAP = {}
WEEKLY_SALES = {}
CATEGORIES = []
FORECAST_TIMESERIES = []
EXCEPTIONS = []
WEEK_LABELS = {}
WEEK_KEYS = []
KPI_SUMMARY = {}
MODEL_METRICS = []
MODEL_COMPARISON = []
BACKTEST_RESULTS = {}
LOCATIONS = []
N_SKUS = 0

# Accuracy monitoring state
ACCURACY_HISTORY = []  # list of AccuracyTrendPoint dicts
EXCEPTIONS_STORE = {}  # id -> dict, mutable for workflow
APP_CONFIG = {}  # cached config
# Calendar metadata for the uploaded dataset, so exception detection can be
# re-run (with a new threshold) without re-parsing the source file.
USER_DATASET_META = None  # {'week_keys', 'week_dates', 'week_day_counts'} or None (M5 default)

# Forecast/backtest caches — keyed by (sku_id, horizon, preferred) / sku_id.
# Prevents re-fitting the same SKU on every page load or route call.
FORECAST_CACHE = {}
BACKTEST_CACHE = {}

# Guards concurrent full recomputes (e.g. config save + manual rerun)
_recompute_lock = threading.Lock()

_CONFIG_DEFAULTS = {
    'granularity': 'weekly',
    'forecastHorizon': 12,
    'historyWindow': 104,
    'algorithmMode': 'auto',
    'selectedAlgorithm': 'prophet',
    'outlierTreatment': 'winsorize',
    'seasonalityMode': 'auto',
    'backtestingWindow': 8,
    'exceptionThreshold': 25,
    'wapeTarget': 15.0,
    'serviceLevelTarget': 97.5,
    'defaultLeadTime': 14,
    'predictionIntervals': True,
    'hierarchicalReconciliation': 'bottom-up',
}


def get_app_config() -> dict:
    """Resolve the application configuration (defaults merged with user overrides)."""
    return {**_CONFIG_DEFAULTS, **APP_CONFIG}


def resolve_preferred_algorithm() -> str:
    """Map the config's algorithmMode/selectedAlgorithm to the ML backend name."""
    cfg = get_app_config()
    if cfg.get('algorithmMode') == 'manual':
        return 'lightgbm' if cfg.get('selectedAlgorithm') == 'lightgbm' else 'prophet'
    return 'lightgbm'  # auto: LightGBM primary, Prophet in the fallback chain


def _apply_config_to_series(series: list) -> list:
    """Trim to the configured history window and apply outlier treatment."""
    cfg = get_app_config()
    hw = cfg.get('historyWindow', 104)
    if hw and hw > 0 and len(series) > hw:
        series = series[-hw:]
    if cfg.get('outlierTreatment') != 'none':
        series = fe.apply_outlier_treatment(series, cfg.get('outlierTreatment', 'winsorize'))
    return series

def _lazy_init():
    global _initialized, SKUS, SKU_DETAIL_MAP, WEEKLY_SALES, CATEGORIES
    global FORECAST_TIMESERIES, EXCEPTIONS, WEEK_LABELS, WEEK_KEYS
    global KPI_SUMMARY, MODEL_METRICS, MODEL_COMPARISON, BACKTEST_RESULTS, LOCATIONS, N_SKUS
    global ACCURACY_HISTORY, EXCEPTIONS_STORE
    if _initialized:
        return
    with _lock:
        if _initialized:
            return
        t_init_start = time.time()

        # Try loading M5 dataset; if parquet engines are unavailable, skip gracefully
        try:
            logger.info("Loading M5 dataset...")
            data = m5_loader.preprocess(117)
        except Exception as exc:
            logger.warning("M5 dataset unavailable (%s). Using uploaded data only.", exc)
            _initialized = True
            return

        SKUS = data['skus']
        SKU_DETAIL_MAP = data['sku_detail_map']
        CATEGORIES = data['categories']
        FORECAST_TIMESERIES = data['forecast_timeseries']
        EXCEPTIONS = data['exceptions']
        WEEK_LABELS = data['week_labels']
        WEEK_KEYS = data['week_keys']
        N_SKUS = len(SKUS)
        LOCATIONS = sorted(set(s['location'] for s in SKUS))

        # Initialize exceptions store with status
        for exc in EXCEPTIONS:
            exc['status'] = 'open'
            EXCEPTIONS_STORE[exc['id']] = exc

        logger.info("Pre-computing ML forecasts for %d SKUs...", N_SKUS)
        _precompute_forecasts(start_timer=t_init_start)

        _initialized = True
        logger.info("Ready: %d SKUs, %d categories, %d weeks", N_SKUS, len(CATEGORIES), len(WEEK_KEYS))

def rebuild_exceptions():
    """Re-run rule-based exception detection on the current SKUs.

    Uses the configured exceptionThreshold, so threshold changes from the
    configuration panel take effect on the next full recompute.
    """
    global EXCEPTIONS, EXCEPTIONS_STORE
    from generic_dataset import _build_user_exceptions
    if USER_DATASET_META:
        week_order = USER_DATASET_META.get('week_keys')
        week_dates = USER_DATASET_META.get('week_dates')
        week_day_counts = USER_DATASET_META.get('week_day_counts')
    else:
        week_order, week_dates, week_day_counts = WEEK_KEYS, None, None
    excs = _build_user_exceptions(SKUS, week_order=week_order, week_dates=week_dates,
                                  week_day_counts=week_day_counts)
    EXCEPTIONS = excs
    EXCEPTIONS_STORE = {}
    for exc in EXCEPTIONS:
        exc['status'] = 'open'
        EXCEPTIONS_STORE[exc['id']] = exc
    return EXCEPTIONS


def _precompute_forecasts(start_timer: float = 0):
    """Pre-compute KPIs, model comparison, backtest using ML models.
    All deltas compare the main model against a Naive baseline.
    """
    global KPI_SUMMARY, MODEL_METRICS, MODEL_COMPARISON, BACKTEST_RESULTS, FORECAST_TIMESERIES
    global ACCURACY_HISTORY

    t_start = start_timer or time.time()

    # Exceptions reflect the current SKU set and the configured threshold
    rebuild_exceptions()

    # Configuration panel drives the horizon / algorithm used for the KPI run
    cfg = get_app_config()
    cfg_horizon = max(int(cfg.get('forecastHorizon', 12)), 4)
    preferred = resolve_preferred_algorithm()
    bt_horizon = max(int(cfg.get('backtestingWindow', 8)), 2)

    # Build real sales series from forecast timeseries
    sales_values = [ts['actual'] for ts in FORECAST_TIMESERIES if ts['actual'] is not None]
    week_labels_ts = [ts['week'] for ts in FORECAST_TIMESERIES if ts['actual'] is not None]
    n_history = len(sales_values)

    if n_history >= 12:
        split = int(n_history * 0.8)
        train = sales_values[:split]
        test = sales_values[split:]
        fc_horizon = min(len(test), cfg_horizon)

        # Main model: ML forecast on the holdout window (out-of-sample KPI)
        fc_result = mlf.auto_ml_forecast(train, fc_horizon, preferred=preferred,
                                         seasonality_mode=cfg.get('seasonalityMode', 'auto'))
        actuals = test[:fc_horizon]
        forecasts = fc_result['p50'][:fc_horizon]
        kpi = fe.compute_kpi_metrics(actuals, forecasts)

        # Future forecast for the dashboard chart — trained on the FULL
        # history and appended after the last actual week (no fake repeats).
        future = mlf.auto_ml_forecast(sales_values, cfg_horizon, preferred=preferred,
                                      seasonality_mode=cfg.get('seasonalityMode', 'auto'))
        kpi['totalForecastedDemand'] = round(float(sum(future['p50'])), -2)
        future_p10 = future.get('p10') or [v * 0.9 for v in future['p50']]
        future_p90 = future.get('p90') or [v * 1.1 for v in future['p50']]

        new_ts = [
            {"week": week_labels_ts[i], "actual": sales_values[i],
             "p50": None, "p10": None, "p90": None}
            for i in range(n_history)
        ]
        last_key = WEEK_KEYS[-1] if WEEK_KEYS else None
        future_weeks = []
        try:
            last_date = datetime.strptime(f'{last_key}-1', '%G-W%V-%u')
            future_weeks = [(last_date + timedelta(weeks=i + 1)).strftime('%b %d')
                            for i in range(len(future['p50']))]
        except Exception:
            future_weeks = [f'W{i + 1}' for i in range(len(future['p50']))]
        for i, wk in enumerate(future_weeks):
            new_ts.append({
                "week": wk, "actual": None,
                "p50": future['p50'][i],
                "p10": future_p10[i],
                "p90": future_p90[i],
            })
        FORECAST_TIMESERIES = new_ts
    else:
        actuals = [ts['actual'] for ts in FORECAST_TIMESERIES if ts['actual'] is not None]
        forecasts = [ts['p50'] for ts in FORECAST_TIMESERIES if ts['actual'] is not None]
        kpi = fe.compute_kpi_metrics(actuals, forecasts)

    kpi_wape = kpi.get('wape', 0)
    kpi_mape = kpi.get('mape', 0)
    kpi_bias = kpi.get('forecastBias', 0)
    kpi_service = kpi.get('serviceLevel', 0)
    kpi_demand = kpi.get('totalForecastedDemand', 0)
    kpi_exceptions = len(EXCEPTIONS)

    # Deltas compare against the previous run of the SAME dataset. When the
    # dataset changed (SKU count differs) or there is no prior snapshot, the
    # comparison is not meaningful and is omitted (null).
    prev = ACCURACY_HISTORY[-1] if ACCURACY_HISTORY else None
    same_run = prev is not None and prev.get('skuCount') == N_SKUS
    if same_run:
        wape_delta = round(kpi_wape - prev['wape'], 1)
        mape_delta = round(kpi_mape - prev['mape'], 1)
        bias_delta = round(abs(kpi_bias) - abs(prev.get('bias', 0)), 1)
        service_delta = round(kpi_service - prev.get('serviceLevel', 0), 1)
        exception_delta = kpi_exceptions - prev.get('exceptionSkus', kpi_exceptions)
        demand_delta = round(kpi_demand - prev.get('totalForecastedDemand', kpi_demand), -1)
        if abs(demand_delta) < 100:
            demand_delta = 0
    else:
        wape_delta = mape_delta = bias_delta = service_delta = exception_delta = demand_delta = None

    # Get all SKU sales for model comparison
    series_list = [sku.get('fullTrend', sku['trend']) for sku in SKUS]
    series_list = [s for s in series_list if len(s) >= 16]
    logger.info("Running model comparison on %d SKUs...", min(len(series_list), 50))
    model_comp = fe.compute_model_comparison(series_list[:50], horizon=bt_horizon)
    logger.info("Model comparison done")

    # Compute backtest on up to 100 SKUs for performance
    bt_mapes = []
    bt_results_list = []
    n_bt = min(len(SKUS), 100)
    logger.info("Running backtest on %d SKUs...", n_bt)
    for idx, sku in enumerate(SKUS[:100]):
        if idx > 0 and idx % 10 == 0:
            logger.info("  backtest progress: %d/%d", idx, n_bt)
        series = sku.get('fullTrend', sku['trend'])
        if len(series) >= 16:
            bt = fe.backtest(series, n_splits=3, horizon=bt_horizon)
            if bt['mape'] > 0:
                bt_mapes.append(bt['mape'])
                bt_results_list.append({
                    "model": sku['model'],
                    "mape": bt['mape'],
                    "wape": bt['wape'],
                    "bias": bt['bias'],
                    "coverage": round(100 - bt['mape'], 1),
                })

    avg_bt_mape = float(np.mean(bt_mapes)) if bt_mapes else 0
    if same_run:
        bt_mape_delta = round(avg_bt_mape - prev.get('btMape', avg_bt_mape), 1)
    else:
        bt_mape_delta = None

    elapsed = time.time() - t_start
    duration_min = int(elapsed // 60)
    duration_sec = int(elapsed % 60)
    duration_str = f"{duration_min} min {duration_sec} sec"

    exception_rate = len(EXCEPTIONS) / max(N_SKUS, 1) * 100

    KPI_SUMMARY = {
        "wape": kpi_wape,
        "wapeDelta": wape_delta,
        "mape": kpi_mape,
        "mapeDelta": mape_delta,
        "totalForecastedDemand": kpi_demand,
        "totalForecastedDemandDelta": demand_delta,
        "exceptionSkus": len(EXCEPTIONS),
        "exceptionSkusDelta": exception_delta,
        "forecastBias": kpi_bias,
        "serviceLevel": kpi_service,
        "serviceLevelDelta": service_delta,
    }

    def delta_formatted(d, suffix="%"):
        if d is None:
            return "—"
        return f"+{d}{suffix}" if d > 0 else f"{d}{suffix}"

    def neg(d):
        return -d if d is not None else None

    def trend_from(d, lower_is_better=True):
        if d is None or d == 0:
            return "neutral"
        return "positive" if (d < 0 and lower_is_better) or (d > 0 and not lower_is_better) else "negative"

    MODEL_METRICS = [
        {"label": "Forecast Accuracy (WAPE)", "value": f"{max(0, 100 - kpi_wape):.1f}%",
         "delta": delta_formatted(neg(wape_delta)), "trend": trend_from(wape_delta)},
        {"label": "Bias Error", "value": f"{abs(kpi_bias):.1f}%",
         "delta": delta_formatted(neg(bias_delta)), "trend": trend_from(bias_delta)},
        {"label": "Service Level Coverage", "value": f"{kpi_service:.1f}%",
         "delta": delta_formatted(service_delta), "trend": trend_from(service_delta, lower_is_better=False)},
        {"label": "Exception Rate", "value": f"{exception_rate:.1f}%",
         "delta": delta_formatted(neg(exception_delta)), "trend": trend_from(exception_delta)},
        {"label": "Avg. Backtest MAPE", "value": f"{avg_bt_mape:.1f}%",
         "delta": delta_formatted(bt_mape_delta), "trend": trend_from(bt_mape_delta)},
        {"label": "Model Retrain Duration", "value": duration_str,
         "delta": "—", "trend": "neutral"},
    ]

    MODEL_COMPARISON = model_comp if model_comp else [
        {"name": m["model"], "accuracy": max(0, 100 - m["mape"]),
         "bias": m["bias"], "coverage": m.get("coverage", round(100 - m["mape"], 1)), "speed": "Fast"}
        for m in bt_results_list[:6]
    ]

    BACKTEST_RESULTS = {
        "lastRun": datetime.now(timezone.utc).isoformat(),
        "duration": duration_str,
        "skuCount": N_SKUS,
        "locations": len(set(s['location'] for s in SKUS)),
        "results": bt_results_list[:5],
    }

    # Accuracy history snapshot for drift monitoring — also carries the
    # metrics the KPI deltas compare against on the next run.
    ACCURACY_HISTORY.append({
        "date": datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        "wape": kpi_wape,
        "mape": kpi_mape,
        "bias": kpi_bias,
        "serviceLevel": kpi_service,
        "skuCount": N_SKUS,
        "exceptionSkus": kpi_exceptions,
        "totalForecastedDemand": kpi_demand,
        "btMape": avg_bt_mape,
    })
    # Keep last 52 snapshots
    if len(ACCURACY_HISTORY) > 52:
        ACCURACY_HISTORY = ACCURACY_HISTORY[-52:]

def compute_sku_forecast(sku_id: str, horizon: int | None = None, preferred: str | None = None) -> dict:
    """Compute a forecast using ML models with price/event features.

    horizon/preferred default to the values from the configuration panel
    (forecastHorizon + algorithmMode/selectedAlgorithm). Results are cached per
    (sku_id, horizon, model) so repeated calls from SKU detail, hierarchy,
    promotions, and consensus reuse the same fit instead of re-running an
    expensive model (Prophet ~30-60s) every time.
    """
    cfg = get_app_config()
    if horizon is None:
        horizon = cfg.get('forecastHorizon', 12)
    if preferred is None:
        preferred = resolve_preferred_algorithm()
    _lazy_init()
    cache_key = (sku_id, horizon, preferred)
    cached = FORECAST_CACHE.get(cache_key)
    if cached is not None:
        return cached

    series = get_sku_timeseries(sku_id)
    series = _apply_config_to_series(series)
    if len(series) < 4:
        result = {"p50": [0]*horizon, "p10": [0]*horizon, "p90": [0]*horizon}
        FORECAST_CACHE[cache_key] = result
        return result

    # Get price and event data if available
    sku = SKU_DETAIL_MAP.get(sku_id, {})
    prices = sku.get('priceHistory')
    events = sku.get('events')

    # Use ML forecast with auto-fallback (Prophet stays in the fallback chain)
    result = mlf.auto_ml_forecast(series, horizon, prices, events, preferred=preferred,
                                  seasonality_mode=cfg.get('seasonalityMode', 'auto'))

    # Prediction intervals can be disabled from the configuration panel
    if not cfg.get('predictionIntervals', True):
        result = {"p50": result['p50'], "p10": list(result['p50']), "p90": list(result['p50'])}

    # Update SKU's forecast in place for caching
    sku['cached_forecast'] = result
    FORECAST_CACHE[cache_key] = result
    return result

def get_hierarchical_forecast() -> dict:
    """Compute reconciled forecasts across hierarchy per the configuration panel."""
    cfg = get_app_config()
    horizon = cfg.get('forecastHorizon', 12)
    recon_method = cfg.get('hierarchicalReconciliation', 'bottom-up')
    _lazy_init()
    sku_forecasts = {}
    hierarchy = {}
    category_skus = {c['category']: [] for c in CATEGORIES}

    for sku in SKUS:
        sku_id = sku['id']
        fc = compute_sku_forecast(sku_id, horizon=horizon)
        sku_forecasts[sku_id] = fc
        cat = sku['category']
        if cat not in category_skus:
            category_skus[cat] = []
        category_skus[cat].append(sku_id)

    for cat, sku_ids in category_skus.items():
        hierarchy[cat] = sku_ids

    if recon_method == 'none':
        nodes = sku_forecasts
    else:
        nodes = mlf.hierarchical_reconcile(sku_forecasts, hierarchy)
    return {
        "nodes": nodes,
        "reconciliationMethod": recon_method,
        "lastReconciled": datetime.now(timezone.utc).isoformat(),
    }

def get_accuracy_drift() -> dict:
    """Compute accuracy drift report from stored history."""
    _lazy_init()
    kpi = KPI_SUMMARY
    current_wape = kpi.get('wape', 0)
    current_mape = kpi.get('mape', 0)

    drift_wape = 0.0
    drift_mape = 0.0
    degradation = 'stable'

    if len(ACCURACY_HISTORY) >= 2:
        prev = ACCURACY_HISTORY[-2]
        drift_wape = round(current_wape - prev['wape'], 1)
        drift_mape = round(current_mape - prev['mape'], 1)

        if len(ACCURACY_HISTORY) >= 4:
            recent = [h['wape'] for h in ACCURACY_HISTORY[-4:]]
            if recent[-1] > recent[0] * 1.05:
                degradation = 'degrading' if recent[-1] > recent[0] else 'improving'
            elif recent[-1] < recent[0] * 0.95:
                degradation = 'improving'

    return {
        "trend": ACCURACY_HISTORY[-12:],  # Last 12 data points
        "currentWape": current_wape,
        "currentMape": current_mape,
        "driftWape": drift_wape,
        "driftMape": drift_mape,
        "degradation": degradation,
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
    }

def update_exception(exc_id: str, action: str, note: str = None) -> dict:
    """Update exception status (resolve, acknowledge, dismiss)."""
    _lazy_init()
    exc = EXCEPTIONS_STORE.get(exc_id)
    if not exc:
        return None

    if action == 'resolve':
        exc['status'] = 'resolved'
    elif action == 'acknowledge':
        exc['status'] = 'acknowledged'
    elif action == 'dismiss':
        exc['status'] = 'dismissed'

    if note:
        exc['note'] = note
    exc['updatedAt'] = datetime.now(timezone.utc).isoformat()
    return exc

def recompute_forecast_timeseries(weeks: int | None = None, preferred: str | None = None):
    """Re-run full forecast computation with ML and return fresh timeseries."""
    if preferred is None:
        preferred = resolve_preferred_algorithm()
    with _recompute_lock:
        _lazy_init()
        FORECAST_CACHE.clear()
        BACKTEST_CACHE.clear()
        _precompute_forecasts(start_timer=time.time())
    if weeks is None:
        weeks = max(int(get_app_config().get('forecastHorizon', 12)), 4)
    n = min(weeks, len(FORECAST_TIMESERIES))
    return FORECAST_TIMESERIES[-n:]

def get_all_skus():
    _lazy_init()
    cfg = get_app_config()
    horizon = int(cfg.get('forecastHorizon', 12))
    preferred = resolve_preferred_algorithm()
    out = []
    for sku in SKUS:
        item = dict(sku)
        # Real ML forecast first point when it has been computed (cached);
        # otherwise the loader-computed model forecast is already real too.
        cached = FORECAST_CACHE.get((sku['id'], horizon, preferred))
        if cached and cached.get('p50'):
            item['p50Forecast'] = round(float(cached['p50'][0]), 1)
        series = item.get('fullTrend', item.get('trend', []))
        inv = fe.compute_inventory_stats(
            series,
            lead_time_days=int(cfg.get('defaultLeadTime', 14)),
            service_level_target=cfg.get('serviceLevelTarget', 97.5),
            sell_price=item.get('sellPrice'),
            moq=cfg.get('moq', 0))
        item['reorderQty'] = inv['reorderQty']
        item['safetyStock'] = inv['safetyStock']
        out.append(item)
    return out

def get_sku_detail(sku_id: str):
    _lazy_init()
    cfg = get_app_config()
    bt_horizon = max(int(cfg.get('backtestingWindow', 8)), 2)
    detail = SKU_DETAIL_MAP.get(sku_id)
    if not detail:
        return None
    series = detail.get('fullTrend', detail.get('trend', []))
    series = _apply_config_to_series(series)
    if len(series) >= 16:
        forecast = compute_sku_forecast(sku_id)
        detail = {**detail, "forecast": forecast}
        if forecast and forecast.get('p50'):
            detail["p50Forecast"] = round(float(forecast['p50'][0]), 1)
        if sku_id not in BACKTEST_CACHE:
            BACKTEST_CACHE[sku_id] = fe.backtest(series, n_splits=4, horizon=bt_horizon)
        bt = BACKTEST_CACHE[sku_id]
        months = ["Run 1 (Jan)", "Run 2 (Apr)", "Run 3 (Jul)", "Run 4 (Oct)"]
        detail["backtestHistory"] = [
            {"run": months[j], "mape": r["mape"], "wape": r["wape"]}
            for j, r in enumerate(bt.get("results", []))
        ] if bt.get("results") else []
        # Real accuracy stats from the actual backtest, not placeholders
        if bt.get("results"):
            detail["mape"] = bt["mape"]
            detail["bias"] = bt["bias"]
        pattern = fe.detect_demand_pattern(series, seasonality_mode=cfg.get('seasonalityMode', 'auto'))
        detail["pattern"] = pattern
        detail["model"] = {
            'Seasonal': 'Holt-Winters',
            'Intermittent': 'Croston',
            'Erratic': 'ETS',
            'Smooth': 'ETS',
        }.get(pattern, detail.get('model', 'ETS'))
        inv = fe.compute_inventory_stats(
            series,
            lead_time_days=int(cfg.get('defaultLeadTime', 14)),
            service_level_target=cfg.get('serviceLevelTarget', 97.5),
            sell_price=detail.get('sellPrice'),
            moq=cfg.get('moq', 0))
        detail["reorderQty"] = inv['reorderQty']
        detail["safetyStock"] = inv['safetyStock']
    else:
        detail["backtestHistory"] = []
        if len(series) >= 4:
            detail = {**detail, "forecast": compute_sku_forecast(sku_id)}
    return detail

def get_categories():
    _lazy_init()
    return CATEGORIES

def get_forecast_timeseries():
    _lazy_init()
    return FORECAST_TIMESERIES

def get_exceptions():
    _lazy_init()
    return list(EXCEPTIONS_STORE.values())

def get_kpi_summary():
    _lazy_init()
    return KPI_SUMMARY

def get_model_metrics():
    _lazy_init()
    return MODEL_METRICS

def get_model_comparison():
    _lazy_init()
    return MODEL_COMPARISON

def get_backtest_results():
    _lazy_init()
    return BACKTEST_RESULTS

def get_week_keys():
    _lazy_init()
    return WEEK_KEYS

def get_week_labels():
    _lazy_init()
    return WEEK_LABELS

def get_sku_timeseries(sku_id: str) -> list[float]:
    _lazy_init()
    sku = SKU_DETAIL_MAP.get(sku_id)
    if sku:
        return sku.get('fullTrend', sku.get('trend', []))
    return []

def get_locations():
    _lazy_init()
    return LOCATIONS

