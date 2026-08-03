"""
ML Forecasting Engine with LightGBM and Prophet.
Feature engineering from M5 data: lags, rolling stats, price, events, seasonality.
"""
import numpy as np
import pandas as pd
from typing import Optional

np.random.seed(42)

MIN_HISTORY = 26

def _to_series(arr: list[float], name: str = 'y') -> pd.Series:
    return pd.Series(np.array(arr, dtype=float), name=name)

def build_features(series: list[float], horizon: int = 12,
                   prices: Optional[list[float]] = None,
                   events: Optional[list[list[str]]] = None) -> pd.DataFrame:
    """Build feature matrix for ML forecasting.
    
    Args:
        series: Weekly sales values (at least MIN_HISTORY points)
        horizon: Forecast horizon in weeks
        prices: Optional weekly prices aligned with series
        events: Optional list of event name lists per week
    
    Returns:
        DataFrame with engineered features for training
    """
    n = len(series)
    df = pd.DataFrame({'y': series})
    
    # Time features
    df['week_num'] = np.arange(n) % 52
    df['month'] = (np.arange(n) % 52) // 4
    df['quarter'] = (np.arange(n) % 52) // 13
    
    # Lags
    for lag in [1, 2, 4, 8, 12, 24]:
        df[f'lag_{lag}'] = df['y'].shift(lag)
    
    # Rolling statistics
    for w in [4, 8, 12]:
        df[f'rolling_mean_{w}'] = df['y'].shift(1).rolling(w, min_periods=2).mean()
        df[f'rolling_std_{w}'] = df['y'].shift(1).rolling(w, min_periods=2).std()
        df[f'rolling_max_{w}'] = df['y'].shift(1).rolling(w, min_periods=2).max()
    
    # Year-over-year change (52-week lag)
    df['yoy_change'] = df['y'].pct_change(periods=52)
    df['yoy_abs'] = df['y'] - df['y'].shift(52)
    
    # Seasonality features
    df['sin_52'] = np.sin(2 * np.pi * np.arange(n) / 52)
    df['cos_52'] = np.cos(2 * np.pi * np.arange(n) / 52)
    df['sin_26'] = np.sin(2 * np.pi * np.arange(n) / 26)
    df['cos_26'] = np.cos(2 * np.pi * np.arange(n) / 26)
    df['sin_13'] = np.sin(2 * np.pi * np.arange(n) / 13)
    df['cos_13'] = np.cos(2 * np.pi * np.arange(n) / 13)
    
    # Price features
    if prices is not None and len(prices) == n:
        p = pd.Series(prices, dtype=float)
        df['price'] = p
        df['price_change'] = p.pct_change()
        df['price_lag1'] = p.shift(1)
        df['price_rolling_mean_4'] = p.shift(1).rolling(4, min_periods=1).mean()
    
    # Event features
    if events is not None and len(events) == n:
        df['has_event'] = [1 if (e and len(e) > 0 and e[0]) else 0 for e in events]
        event_counts = [len([e for e in ev if e]) if ev else 0 for ev in events]
        df['event_count'] = event_counts
    
    # Trend
    df['trend'] = np.arange(n)
    
    return df

def _has_lightgbm():
    try:
        import lightgbm
        return True
    except Exception:
        return False

_HAS_LGB = _has_lightgbm()

def lightgbm_forecast(series: list[float], horizon: int = 12,
                      prices: Optional[list[float]] = None,
                      events: Optional[list[list[str]]] = None) -> dict:
    """LightGBM forecast with full feature engineering.
    Falls back to Prophet then ETS if not enough history or LightGBM fails.
    """
    if not _HAS_LGB:
        return prophet_forecast(series, horizon, prices, events)
    
    import lightgbm as lgb
    
    n = len(series)
    if n < MIN_HISTORY:
        from forecast_engine import exponential_smoothing_forecast
        return exponential_smoothing_forecast(series, horizon)
    
    try:
        df = build_features(series, horizon, prices, events)
        df = df.dropna().reset_index(drop=True)
        
        if len(df) < 20:
            from forecast_engine import exponential_smoothing_forecast
            return exponential_smoothing_forecast(series, horizon)
        
        feature_cols = [c for c in df.columns if c != 'y']
        X = df[feature_cols].values
        y = df['y'].values
        
        model = lgb.LGBMRegressor(
            n_estimators=200,
            learning_rate=0.1,
            max_depth=5,
            num_leaves=31,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            deterministic=True,
            force_col_wise=True,
            verbose=-1,
        )
        model.fit(X, y)
        
        extended = list(series)
        full_prices = list(prices) if prices else None
        full_events = list(events) if events else None
        
        p50 = []
        for step in range(horizon):
            ext_df = build_features(extended, 1, full_prices, full_events)
            last_row = ext_df.iloc[-1:][feature_cols]
            pred = model.predict(last_row)[0]
            pred = max(pred, 0)
            p50.append(round(float(pred), 1))
            extended.append(pred)
            if full_prices and full_prices:
                full_prices.append(full_prices[-1])
            if full_events:
                full_events.append([])
        
        residuals = np.abs(y - model.predict(X))
        std_resid = float(np.std(residuals)) if len(residuals) > 1 else float(np.mean(y)) * 0.1
        p10 = [max(round(v - 1.28 * std_resid, 1), 0) for v in p50]
        p90 = [round(v + 1.28 * std_resid, 1) for v in p50]
        
        return {"p50": p50, "p10": p10, "p90": p90}
    except Exception:
        return prophet_forecast(series, horizon, prices, events)

def prophet_forecast(series: list[float], horizon: int = 12,
                     prices: Optional[list[float]] = None,
                     events: Optional[list[list[str]]] = None) -> dict:
    """Prophet forecast with optional price/event regressors.
    Falls back to LightGBM if Prophet fails.
    """
    n = len(series)
    if n < MIN_HISTORY:
        return lightgbm_forecast(series, horizon, prices, events)
    
    try:
        from prophet import Prophet
        
        df = pd.DataFrame({
            'ds': pd.date_range(end='2026-07-24', periods=n, freq='W'),
            'y': series,
        })
        
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False,
            seasonality_mode='multiplicative',
            changepoint_prior_scale=0.05,
        )
        
        if prices is not None and len(prices) == n:
            df['price'] = prices
            model.add_regressor('price')
        
        if events is not None and len(events) == n:
            df['has_event'] = [1 if (e and len(e) > 0 and e[0]) else 0 for e in events]
            model.add_regressor('has_event')
        
        model.fit(df)
        
        future = model.make_future_dataframe(periods=horizon, freq='W', include_history=False)
        
        if prices is not None:
            last_price = prices[-1]
            future['price'] = [last_price] * horizon
        if events is not None:
            future['has_event'] = [0] * horizon
        
        forecast = model.predict(future)

        # Deterministic prediction intervals: Prophet's yhat_upper/yhat_lower are
        # drawn from 1000 random posterior samples and differ run-to-run; rebuild
        # them from the residual spread of the deterministic point forecast instead.
        in_sample = model.predict(df)['yhat']
        resid = np.abs(np.asarray(series, dtype=float) - np.asarray(in_sample, dtype=float))
        std_resid = float(np.std(resid)) if len(resid) > 1 else float(np.mean(series)) * 0.1
        p50 = [max(round(float(v), 1), 0) for v in forecast['yhat']]
        p10 = [max(round(float(v - 1.28 * std_resid), 1), 0) for v in p50]
        p90 = [round(float(v + 1.28 * std_resid), 1) for v in p50]
        
        return {"p50": p50, "p10": p10, "p90": p90}
    except Exception:
        # Terminal fallback: ETS. Do NOT bounce back to lightgbm_forecast here —
        # that would recurse infinitely when both ML libraries fail.
        from forecast_engine import exponential_smoothing_forecast
        return exponential_smoothing_forecast(series, horizon)

def auto_ml_forecast(series: list[float], horizon: int = 12,
                     prices: Optional[list[float]] = None,
                     events: Optional[list[list[str]]] = None,
                     preferred: str = 'lightgbm',
                     seasonality_mode: str = 'auto') -> dict:
    """Auto-select forecast method. Falls back through Prophet→LightGBM→ETS.

    Strongly seasonal series are routed to Holt-Winters so the forecast
    continues the seasonal wave instead of extrapolating a smooth trend.
    seasonality_mode overrides the seasonal routing ('auto', 'weekly',
    'monthly', 'yearly', 'none').
    """
    n = len(series)
    if n < MIN_HISTORY:
        from forecast_engine import forecast_for_pattern, detect_demand_pattern
        pattern = detect_demand_pattern(series, seasonality_mode=seasonality_mode)
        return forecast_for_pattern(series, pattern, horizon)
    
    # Seasonal routing: seasonal models carry the yearly wave forward,
    # which ML extrapolation smooths away
    if n >= 52:
        try:
            from forecast_engine import detect_demand_pattern, holt_winters_forecast
            pattern = detect_demand_pattern(series, seasonality_mode=seasonality_mode)
            if pattern == "Seasonal":
                result = holt_winters_forecast(series, horizon)
                if len(set(result['p50'])) > 1:
                    return result
        except Exception:
            pass

    if preferred == 'prophet':
        result = prophet_forecast(series, horizon, prices, events)
    else:
        result = lightgbm_forecast(series, horizon, prices, events)
    
    # Validate: if forecast is degenerate (all same value), fallback
    if len(set(result['p50'])) <= 1:
        from forecast_engine import forecast_for_pattern, detect_demand_pattern
        pattern = detect_demand_pattern(series, seasonality_mode=seasonality_mode)
        return forecast_for_pattern(series, pattern, horizon)
    
    return result

def hierarchical_reconcile(sku_forecasts: dict[str, dict],
                           hierarchy: dict[str, list[str]]) -> dict:
    """Bottom-up hierarchical reconciliation.
    
    Args:
        sku_forecasts: {sku_id: {p50, p10, p90}} — per-SKU forecasts
        hierarchy: {node: [child_ids]} — e.g. {'Foods': ['sku-001', 'sku-002']}
    
    Returns:
        Flattened forecasts with reconciled aggregates:
        {node: {p50, p10, p90}} for all nodes and leaves
    """
    result = {}
    
    # Pass-through leaf node forecasts
    for sku_id, fc in sku_forecasts.items():
        result[sku_id] = fc
    
    # Bottom-up aggregation
    def _aggregate(node: str) -> dict:
        if node in result:
            return result[node]
        
        children = hierarchy.get(node, [])
        if not children:
            return {"p50": [0]*12, "p10": [0]*12, "p90": [0]*12}
        
        agg = {"p50": None, "p10": None, "p90": None}
        for child in children:
            child_fc = _aggregate(child)
            for key in agg:
                if agg[key] is None:
                    agg[key] = list(child_fc[key])
                else:
                    agg[key] = [a + b for a, b in zip(agg[key], child_fc[key])]
        
        result[node] = agg
        return agg
    
    for node in hierarchy:
        _aggregate(node)
    
    return result
