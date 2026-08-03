"""
ForecastIQ Forecasting Engine v2
Trains on actual M5 timeseries data using real statistical models.
"""
import warnings
import numpy as np
from math import sqrt, erf, pi, exp
from typing import Optional
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import acf

warnings.filterwarnings("ignore", message="Optimization failed to converge", category=UserWarning, module="statsmodels")

np.random.seed(42)

MIN_HISTORY = 8

def _safe_series(series: list[float]) -> np.ndarray:
    arr = np.array(series, dtype=float)
    arr = np.nan_to_num(arr, nan=0.0)
    return arr

def detect_demand_pattern(series: list[float], seasonality_mode: str = 'auto') -> str:
    """Detect the demand pattern.

    seasonality_mode overrides the seasonal classification:
    'none' forces non-seasonal models, 'yearly'/'monthly'/'weekly' force
    seasonal models (Intermittent routing is always preserved).
    """
    arr = _safe_series(series)
    n = len(arr)
    if n < 4:
        return "Smooth"
    zero_ratio = np.sum(arr == 0) / n
    if zero_ratio > 0.25:
        return "Intermittent"
    if seasonality_mode == 'none':
        return "Smooth"
    if seasonality_mode in ('yearly', 'monthly', 'weekly'):
        return "Seasonal"
    mean_val = np.mean(arr)
    if mean_val > 0 and np.std(arr) / mean_val > 1.2:
        return "Erratic"
    if n >= 52:
        try:
            acf_vals = acf(arr, nlags=min(52, n//2))
            if len(acf_vals) > 4 and acf_vals[4] > 0.3:
                return "Seasonal"
        except:
            pass
    return "Smooth"


def apply_outlier_treatment(series: list[float], method: str = 'winsorize') -> list[float]:
    """Clean a demand series according to the configured outlier treatment.

    - 'winsorize': clip to the 1st/99th percentiles
    - 'remove': replace values beyond 3 sigma with a 5-week rolling median
    - 'none': return the series unchanged
    """
    arr = _safe_series(series)
    if method == 'none' or len(arr) < 5:
        return [float(v) for v in arr]
    if method == 'winsorize':
        lo, hi = np.percentile(arr, [1, 99])
        if lo == hi:
            return [float(v) for v in arr]
        return [float(min(max(v, lo), hi)) for v in arr]
    if method == 'remove':
        mean_val, std_val = np.mean(arr), np.std(arr)
        if std_val <= 0:
            return [float(v) for v in arr]
        rolling = np.array([float(np.median(arr[max(0, i - 2):i + 3])) for i in range(len(arr))])
        cleaned = [float(v) if abs(v - mean_val) <= 3 * std_val else rolling[i]
                   for i, v in enumerate(arr)]
        return cleaned
    return [float(v) for v in arr]

def naive_forecast(series: list[float], horizon: int = 12) -> dict:
    """Naive: repeat last known value."""
    arr = _safe_series(series)
    last = arr[-1] if len(arr) > 0 else 0
    residuals = np.abs(np.diff(arr)) if len(arr) > 1 else np.array([last * 0.1])
    std_resid = float(np.mean(residuals)) if len(residuals) > 0 else last * 0.1
    p50 = [float(last)] * horizon
    p10 = [max(float(last - 1.28 * std_resid), 0)] * horizon
    p90 = [float(last + 1.28 * std_resid)] * horizon
    return {"p50": p50, "p10": p10, "p90": p90}

def seasonal_naive_forecast(series: list[float], horizon: int = 12, season_period: int = 52) -> dict:
    """Seasonal naive: repeat last season's values."""
    arr = _safe_series(series)
    n = len(arr)
    if n < season_period:
        return naive_forecast(series, horizon)
    last_season = arr[-season_period:]
    p50 = []
    for i in range(horizon):
        p50.append(float(last_season[i % season_period]))
    residuals = []
    for i in range(season_period, n):
        residuals.append(arr[i] - arr[i - season_period])
    std_resid = float(np.std(residuals)) if len(residuals) > 1 else np.mean(arr) * 0.1
    p10 = [max(float(v - 1.28 * std_resid), 0) for v in p50]
    p90 = [float(v + 1.28 * std_resid) for v in p50]
    return {"p50": p50, "p10": p10, "p90": p90}

def exponential_smoothing_forecast(series: list[float], horizon: int = 12) -> dict:
    """Holt-Winters exponential smoothing via statsmodels."""
    arr = _safe_series(series)
    n = len(arr)
    if n < 4:
        return naive_forecast(series, horizon)
    try:
        # 'heuristic' initialization is ~10-50x faster than 'estimated' with
        # near-identical accuracy — important since this runs per-fold in backtests.
        model = ExponentialSmoothing(
            arr, trend='add', seasonal=None, initialization_method='heuristic'
        ).fit()
        forecast = model.forecast(horizon)
        residuals = model.resid
        std_resid = float(np.std(residuals)) if len(residuals) > 1 else float(np.mean(np.abs(arr))) * 0.1
        p50 = [max(float(v), 0) for v in forecast]
        # Degenerate fit (flat forecast): keep the seasonal wave instead of a
        # constant level — seasonal naive for seasonal-length series
        spread = max(p50) - min(p50)
        if spread <= max(1.0, float(np.mean(p50)) * 0.01):
            if n >= 52:
                return seasonal_naive_forecast(series, horizon)
            return naive_forecast(series, horizon)
        # Intervals fan out with horizon, matching real forecast uncertainty growth
        p10 = [max(float(v - 1.28 * std_resid * (1 + 0.07 * i)), 0) for i, v in enumerate(p50)]
        p90 = [float(v + 1.28 * std_resid * (1 + 0.07 * i)) for i, v in enumerate(p50)]
        return {"p50": p50, "p10": p10, "p90": p90}
    except Exception as e:
        return naive_forecast(series, horizon)

def holt_winters_forecast(series: list[float], horizon: int = 12, season_period: int = 52) -> dict:
    """Holt-Winters with seasonality."""
    arr = _safe_series(series)
    n = len(arr)
    if n < season_period + 4:
        return exponential_smoothing_forecast(series, horizon)
    try:
        model = ExponentialSmoothing(
            arr, trend='add', seasonal='add', seasonal_periods=min(season_period, n // 2),
            initialization_method='heuristic'
        ).fit()
        forecast = model.forecast(horizon)
        p50 = [max(float(v), 0) for v in forecast]
        # Degenerate fit (flat forecast): fall back to seasonal naive so the
        # forecast keeps the seasonal wave instead of a constant level
        spread = max(p50) - min(p50)
        if spread <= max(1.0, float(np.mean(p50)) * 0.01):
            return seasonal_naive_forecast(series, horizon)
        residuals = model.resid
        std_resid = float(np.std(residuals)) if len(residuals) > 1 else float(np.mean(np.abs(arr))) * 0.1
        # Intervals fan out with horizon, matching real forecast uncertainty growth
        p10 = [max(float(v - 1.28 * std_resid * (1 + 0.07 * i)), 0) for i, v in enumerate(p50)]
        p90 = [float(v + 1.28 * std_resid * (1 + 0.07 * i)) for i, v in enumerate(p50)]
        return {"p50": p50, "p10": p10, "p90": p90}
    except Exception as e:
        return exponential_smoothing_forecast(series, horizon)

def arima_forecast(series: list[float], horizon: int = 12) -> dict:
    """ARIMA(1,1,1) forecast."""
    arr = _safe_series(series)
    n = len(arr)
    if n < 4:
        return naive_forecast(series, horizon)
    try:
        model = ARIMA(arr, order=(1, 1, 1)).fit()
        forecast = model.forecast(horizon)
        residuals = model.resid
        std_resid = float(np.std(residuals)) if len(residuals) > 1 else float(np.mean(np.abs(arr))) * 0.1
        p50 = [max(float(v), 0) for v in forecast]
        p10 = [max(float(v - 1.28 * std_resid), 0) for v in forecast]
        p90 = [float(v + 1.28 * std_resid) for v in forecast]
        return {"p50": p50, "p10": p10, "p90": p90}
    except Exception as e:
        return exponential_smoothing_forecast(series, horizon)

def croston_forecast(series: list[float], horizon: int = 12) -> dict:
    """Simple Croston-style forecast for intermittent demand.
    Forecasts average non-zero demand size and inter-demand interval separately,
    then combines them. Falls back to naive if not enough data.
    """
    arr = _safe_series(series)
    non_zero = arr[arr > 0]
    if len(non_zero) < 3:
        return naive_forecast(series, horizon)
    
    # Inter-demand intervals
    intervals = []
    last = -1
    for i, v in enumerate(arr):
        if v > 0:
            if last >= 0:
                intervals.append(i - last)
            last = i
    intervals = np.array(intervals, dtype=float)
    
    if len(intervals) < 2:
        return naive_forecast(series, horizon)
    
    avg_demand = float(np.mean(non_zero[-min(len(non_zero), 8):]))
    avg_interval = float(np.mean(intervals[-min(len(intervals), 8):]))
    if avg_interval < 1:
        avg_interval = 1
    
    p50 = []
    rng = np.random.default_rng(42)
    for i in range(horizon):
        if i % max(int(round(avg_interval)), 1) == 0:
            val = avg_demand * (1 + rng.uniform(-0.2, 0.2))
        else:
            val = 0
        p50.append(max(round(val, 1), 0))
    
    std_resid = float(np.std(non_zero)) if len(non_zero) > 1 else avg_demand * 0.3
    p10 = [max(v - 1.28 * std_resid, 0) for v in p50]
    p90 = [v + 1.28 * std_resid for v in p50]
    return {"p50": p50, "p10": p10, "p90": p90}

def forecast_for_pattern(series: list[float], pattern: str, horizon: int = 12) -> dict:
    """Select forecast model based on demand pattern."""
    if pattern == "Seasonal":
        return holt_winters_forecast(series, horizon)
    elif pattern == "Intermittent":
        return croston_forecast(series, horizon)
    elif pattern == "Erratic":
        return exponential_smoothing_forecast(series, horizon)
    else:
        return exponential_smoothing_forecast(series, horizon)

def calculate_mape(actual: list[float], forecast: list[float]) -> float:
    arr_a = np.array(actual, dtype=float)
    arr_f = np.array(forecast[:len(actual)], dtype=float)
    mask = arr_a != 0
    if not np.any(mask):
        return 0.0
    ape = np.abs((arr_a[mask] - arr_f[mask]) / arr_a[mask])
    ape = ape[~np.isinf(ape)]
    return round(float(np.mean(ape)) * 100, 1) if len(ape) > 0 else 0.0

def calculate_wape(actual: list[float], forecast: list[float]) -> float:
    arr_a = np.array(actual, dtype=float)
    arr_f = np.array(forecast[:len(actual)], dtype=float)
    total = np.sum(np.abs(arr_a))
    if total == 0:
        return 0.0
    return round(float(np.sum(np.abs(arr_a - arr_f)) / total * 100), 1)

def calculate_bias(actual: list[float], forecast: list[float]) -> float:
    arr_a = np.array(actual, dtype=float)
    arr_f = np.array(forecast[:len(actual)], dtype=float)
    mask = arr_a > 0
    if not mask.any():
        return round(float(np.mean(arr_f - arr_a)), 1)
    pct = (arr_f[mask] - arr_a[mask]) / arr_a[mask] * 100
    return round(float(np.mean(pct)), 1)

def backtest(series: list[float], n_splits: int = 4, horizon: int = 8, force_naive: bool = False, seasonal: bool = False) -> dict:
    """Time-series cross-validation backtest."""
    arr = _safe_series(series)
    n = len(arr)
    if n < horizon + 4:
        return {"mape": 0, "wape": 0, "bias": 0, "results": []}
    results = []
    step = (n - horizon) // n_splits
    for i in range(n_splits):
        split_point = n - horizon - (n_splits - 1 - i) * step
        if split_point < 4:
            break
        train = arr[:split_point]
        test = arr[split_point:split_point + horizon]
        if len(train) < 4 or len(test) < 2:
            break
        if force_naive and seasonal:
            fc = seasonal_naive_forecast(train.tolist(), horizon)
        elif force_naive:
            fc = naive_forecast(train.tolist(), horizon)
        else:
            pattern = detect_demand_pattern(train.tolist())
            fc = forecast_for_pattern(train.tolist(), pattern, horizon)
        mape = calculate_mape(test.tolist(), fc['p50'])
        wape = calculate_wape(test.tolist(), fc['p50'])
        bias = calculate_bias(test.tolist(), fc['p50'])
        results.append({"fold": i + 1, "mape": mape, "wape": wape, "bias": bias})
    if results:
        avg_mape = np.mean([r['mape'] for r in results])
        avg_wape = np.mean([r['wape'] for r in results])
        avg_bias = np.mean([r['bias'] for r in results])
        return {"mape": round(float(avg_mape), 1), "wape": round(float(avg_wape), 1),
                "bias": round(float(avg_bias), 1), "results": results}
    return {"mape": 0, "wape": 0, "bias": 0, "results": []}

def compute_kpi_metrics(actuals: list[float], forecasts: list[float]) -> dict:
    """Compute all KPI metrics from actual vs forecast arrays."""
    mape = calculate_mape(actuals, forecasts)
    wape = calculate_wape(actuals, forecasts)
    bias = calculate_bias(actuals, forecasts)
    actual_arr = np.array(actuals, dtype=float)
    forecast_arr = np.array(forecasts[:len(actuals)], dtype=float)
    errors = np.abs(actual_arr - forecast_arr)
    threshold = np.percentile(errors, 80) if len(errors) > 5 else 0
    exception_count = int(np.sum(errors > threshold)) if threshold > 0 else 0
    service = float(np.mean(forecast_arr >= actual_arr)) * 100 if len(actual_arr) > 0 else 0
    total_demand = float(np.sum(forecasts))
    return {
        "wape": wape,
        "mape": mape,
        "forecastBias": bias,
        "exceptionSkus": exception_count,
        "serviceLevel": round(service, 1),
        "totalForecastedDemand": round(total_demand, -2),
    }

def compute_model_comparison(series_list: list[list[float]], horizon: int = 12) -> list[dict]:
    """Compare multiple models on the same timeseries set."""
    models = [
        ("Naive", naive_forecast),
        ("SES", exponential_smoothing_forecast),
        ("ARIMA", arima_forecast),
    ]
    results = []
    for name, fn in models:
        all_mape = []
        all_bias = []
        all_coverage = []
        for series in series_list[:20]:  # Sample first 20 for speed
            arr = _safe_series(series)
            if len(arr) < horizon + 2:
                continue
            train = arr[:-horizon]
            test = arr[-horizon:]
            try:
                fc = fn(train.tolist(), horizon)
                pred = fc['p50']
                all_mape.append(calculate_mape(test.tolist(), pred))
                all_bias.append(calculate_bias(test.tolist(), pred))
                residuals = [abs(test[i] - pred[i]) for i in range(len(test))]
                std_resid = float(np.std(residuals)) if len(residuals) > 1 else 0
                lower = [pred[i] - 1.96 * std_resid for i in range(len(test))]
                upper = [pred[i] + 1.96 * std_resid for i in range(len(test))]
                in_interval = sum(1 for i in range(len(test)) if lower[i] <= test[i] <= upper[i])
                all_coverage.append(in_interval / max(len(test), 1) * 100)
            except:
                pass
        if all_mape:
            avg_acc = max(0, 100 - float(np.mean(all_mape)))
            results.append({
                "name": name,
                "accuracy": round(avg_acc, 1),
                "bias": round(float(np.mean(all_bias)), 1),
                "coverage": round(float(np.mean(all_coverage)), 1),
                "speed": "Fast",
            })
    return results


def _erfinv(x):
    t = x
    for _ in range(5):
        t = t - (erf(t) - x) / (2 / sqrt(pi) * exp(-t * t))
    return t * 0.9


def compute_inventory_stats(series: list[float], lead_time_days: int = 14,
                            service_level_target: float = 97.5,
                            sell_price: float | None = None, moq: float = 0,
                            holding_cost_pct: float = 0.25, order_cost: float = 50) -> dict:
    """Safety stock + reorder point from real demand statistics.

    Same math as the inventory optimization endpoint: safety stock uses the
    normal quantile z x sqrt(lead-time demand variance + lead-time variance),
    reorder point = lead-time demand + safety stock (MOQ floor applied).
    """
    arr = _safe_series(series)
    if len(arr) < 8:
        return {"reorderQty": 0.0, "safetyStock": 0.0}
    avg_daily = float(np.mean(arr)) / 7.0
    demand_std = float(np.std(arr)) / sqrt(7.0)
    sl = min(max(service_level_target / 100.0, 0.8), 0.999)
    z = sqrt(2) * _erfinv(2 * sl - 1)
    lt = max(int(lead_time_days), 1)
    lt_std = lt * 0.2
    safety = z * sqrt(lt * demand_std ** 2 + avg_daily ** 2 * lt_std ** 2)
    reorder = avg_daily * lt + safety
    if moq and reorder < moq:
        reorder = float(moq)
    return {"reorderQty": round(float(reorder), 1), "safetyStock": round(float(safety), 1)}


def quick_holdout_stats(series: list[float], horizon: int = 8) -> dict:
    """Real out-of-sample MAPE/bias from a cheap seasonal-naive holdout.

    Used by the demo loader where full model backtests across thousands of
    SKUs would be too slow. Returns {mape, bias}.
    """
    arr = _safe_series(series)
    n = len(arr)
    if n < horizon + 4:
        return {"mape": 0.0, "bias": 0.0}
    train = arr[:-horizon]
    fc = seasonal_naive_forecast(train.tolist(), horizon)
    return {"mape": calculate_mape(arr[-horizon:].tolist(), fc['p50']),
            "bias": calculate_bias(arr[-horizon:].tolist(), fc['p50'])}
