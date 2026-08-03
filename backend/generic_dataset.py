import io
import json
import os
from typing import Any

import pandas as pd
import numpy as np

from data import m5_data

# Buffer for user-uploaded dataset — populated by save endpoint, consumed by rerun_forecast
PENDING_USER_DATASET: dict[str, Any] = {}

# Snapshot of the loaded dataset's structure — consumed by the maturity assessment modules
DATASET_PROFILE: dict[str, Any] = {}

# Where the uploaded dataset is persisted so it survives container restarts
PERSIST_DIR = os.environ.get('PERSIST_DIR', '/data/pending')


def persist_pending_dataset(file_bytes: bytes, filename: str, mapping: dict[str, Any]) -> None:
    """Write the pending upload to the persistent volume (best-effort)."""
    try:
        os.makedirs(PERSIST_DIR, exist_ok=True)
        with open(os.path.join(PERSIST_DIR, 'dataset.bin'), 'wb') as fh:
            fh.write(file_bytes)
        with open(os.path.join(PERSIST_DIR, 'filename.txt'), 'w', encoding='utf-8') as fh:
            fh.write(filename)
        with open(os.path.join(PERSIST_DIR, 'mapping.json'), 'w', encoding='utf-8') as fh:
            json.dump(mapping, fh)
    except OSError:
        # No volume available (e.g. bare local run) — persistence is best-effort
        pass


def restore_persisted_dataset() -> bool:
    """Load the persisted upload back into PENDING_USER_DATASET.

    Called at boot so the previously uploaded dataset is used again
    instead of falling back to the demo M5 data after a restart.
    Returns True when a persisted dataset was restored.
    """
    try:
        with open(os.path.join(PERSIST_DIR, 'dataset.bin'), 'rb') as fh:
            file_bytes = fh.read()
        with open(os.path.join(PERSIST_DIR, 'filename.txt'), 'r', encoding='utf-8') as fh:
            filename = fh.read()
        with open(os.path.join(PERSIST_DIR, 'mapping.json'), 'r', encoding='utf-8') as fh:
            mapping = json.load(fh)
    except (OSError, ValueError):
        return False
    if not file_bytes:
        return False
    PENDING_USER_DATASET['file_bytes'] = file_bytes
    PENDING_USER_DATASET['filename'] = filename
    PENDING_USER_DATASET['mapping'] = mapping
    try:
        PENDING_USER_DATASET['light_profile'] = _light_profile(file_bytes, filename, mapping)
    except Exception:
        PENDING_USER_DATASET.pop('light_profile', None)
    return True


def _detect_granularity(df: pd.DataFrame, date_col: str) -> str:
    """Infer record frequency from the actual spacing between consecutive dates."""
    if date_col not in df.columns:
        return 'weekly'
    unique_dates = pd.Series(df[date_col].unique()).sort_values()
    if len(unique_dates) < 2:
        return 'weekly'
    median_gap = unique_dates.diff().dropna().median()
    if pd.isna(median_gap):
        return 'weekly'
    if median_gap <= pd.Timedelta(days=1.5):
        return 'daily'
    if median_gap <= pd.Timedelta(days=10):
        return 'weekly'
    if median_gap <= pd.Timedelta(days=35):
        return 'monthly'
    return 'weekly'


def _detect_column_features(columns: list[str]) -> dict[str, bool]:
    """Classify columns by keyword to know what data the client has."""
    lower = [str(c).lower().replace(' ', '_') for c in columns]
    return {
        'has_price': any(any(k in c for k in ['price', 'cost', 'rate', 'mrp', 'list_price'])
                         for c in lower),
        'has_promo': any(any(k in c for k in ['promo', 'promotion', 'discount', 'markdown',
                                              'campaign', 'display', 'featured'])
                         for c in lower),
        'has_inventory': any(any(k in c for k in ['inventory', 'stock', 'on_hand', 'onhand',
                                                  'available', 'balance'])
                             for c in lower),
        'has_leadtime': any(any(k in c for k in ['lead', 'leadtime', 'lead_time', 'replenish',
                                                 'transit'])
                            for c in lower),
        'has_external': any(any(k in c for k in ['temp', 'temperature', 'weather', 'rain',
                                                 'humidity', 'gdp', 'inflation', 'unemployment'])
                            for c in lower),
        'has_location': any(any(k in c for k in ['store', 'location', 'warehouse', 'outlet',
                                                 'branch', 'site'])
                            for c in lower),
        'has_category': any(any(k in c for k in ['category', 'family', 'department', 'dept',
                                                 'segment', 'brand'])
                            for c in lower),
    }


class DatasetProfile:
    def __init__(self, dataframe: pd.DataFrame):
        self.dataframe = dataframe

    def infer_column_types(self) -> dict[str, dict[str, Any]]:
        profile: dict[str, dict[str, Any]] = {}
        for column in self.dataframe.columns:
            series = self.dataframe[column]
            inferred = {
                'name': column,
                'dtype': str(series.dtype),
                'null_count': int(series.isna().sum()),
                'unique_count': int(series.nunique(dropna=True)),
                'sample_values': series.dropna().astype(str).head(5).tolist(),
            }
            profile[column] = inferred
        return profile

    def suggest_mapping(self) -> dict[str, Any]:
        columns = list(self.dataframe.columns)
        lower_columns = {col.lower(): col for col in columns}

        target_candidates = [
            lower_columns[key]
            for key in ['demand', 'sales', 'units', 'qty', 'quantity', 'volume', 'target']
            if key in lower_columns
        ]
        date_candidates = [
            lower_columns[key]
            for key in ['date', 'datetime', 'timestamp', 'order_date', 'week', 'period']
            if key in lower_columns
        ]
        entity_candidates = [
            lower_columns[key]
            for key in ['sku', 'product', 'product_id', 'item', 'item_id', 'entity', 'store', 'customer']
            if key in lower_columns
        ]

        target_column = target_candidates[0] if target_candidates else None
        date_column = date_candidates[0] if date_candidates else None
        entity_column = entity_candidates[0] if entity_candidates else None

        if not target_column:
            numeric_columns = [col for col in columns if pd.api.types.is_numeric_dtype(self.dataframe[col])]
            target_column = numeric_columns[0] if numeric_columns else columns[0]
        if not date_column:
            date_like_columns = [col for col in columns if pd.api.types.is_datetime64_any_dtype(self.dataframe[col])]
            date_column = date_like_columns[0] if date_like_columns else columns[0]
        if not entity_column:
            categorical_columns = [col for col in columns if self.dataframe[col].nunique(dropna=True) <= 20]
            entity_column = categorical_columns[0] if categorical_columns else columns[0]

        return {
            'target_column': target_column,
            'date_column': date_column,
            'entity_column': entity_column,
            'frequency': 'W',
            'forecast_horizon': 8,
        }


def profile_dataset(file_bytes: bytes, filename: str) -> dict[str, Any]:
    if filename.endswith('.csv'):
        dataframe = pd.read_csv(io.BytesIO(file_bytes))
    elif filename.endswith(('.xlsx', '.xls')):
        dataframe = pd.read_excel(io.BytesIO(file_bytes))
    else:
        raise ValueError('Unsupported file type. Please upload CSV or Excel.')

    profile = DatasetProfile(dataframe)
    return {
        'columns': profile.infer_column_types(),
        'suggestions': profile.suggest_mapping(),
    }


def _light_profile(file_bytes: bytes, filename: str, mapping: dict[str, Any]) -> dict[str, Any]:
    """Cheap structural profile of an uploaded file (no full column inference).

    Computed once at save time and stored on PENDING_USER_DATASET so the
    pipeline console can show the uploaded file's real shape before the
    dataset is actually loaded by the rerun.
    """
    import pandas as pd

    if filename.endswith('.csv'):
        df = pd.read_csv(io.BytesIO(file_bytes))
    elif filename.endswith(('.xlsx', '.xls')):
        df = pd.read_excel(io.BytesIO(file_bytes))
    else:
        raise ValueError('Unsupported file type. Please upload CSV or Excel.')

    target_col = mapping.get('target_column')
    date_col = mapping.get('date_column')
    entity_col = mapping.get('entity_column')

    if target_col not in df.columns or date_col not in df.columns or entity_col not in df.columns:
        auto = DatasetProfile(df).suggest_mapping()
        target_col = target_col if target_col in df.columns else auto['target_column']
        date_col = date_col if date_col in df.columns else auto['date_column']
        entity_col = entity_col if entity_col in df.columns else auto['entity_column']

    df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
    df = df.dropna(subset=[date_col, target_col, entity_col])
    df['week_key'] = df[date_col].dt.strftime('%G-W%V')
    n_weeks = int(df['week_key'].nunique())

    return {
        'filename': filename,
        'columns': [str(c) for c in df.columns],
        'rows': int(len(df)),
        'null_rate': round(float(df[target_col].isna().mean()), 4),
        'granularity': _detect_granularity(df, date_col),
        'n_weeks': n_weeks,
        'entities': int(df[entity_col].nunique()),
        'date_from': df[date_col].min().strftime('%Y-%m-%d'),
        'date_to': df[date_col].max().strftime('%Y-%m-%d'),
        **_detect_column_features(list(df.columns)),
    }


def load_user_dataset_into_m5(file_bytes: bytes, filename: str, mapping: dict[str, Any]) -> None:
    """Process user CSV and replace m5_data globals with the user's demand data."""
    import pandas as pd
    import numpy as np
    from datetime import datetime
    from data import m5_data

    if filename.endswith('.csv'):
        df = pd.read_csv(io.BytesIO(file_bytes))
    elif filename.endswith(('.xlsx', '.xls')):
        df = pd.read_excel(io.BytesIO(file_bytes))
    else:
        raise ValueError('Unsupported file type. Please upload CSV or Excel.')

    target_col = mapping.get('target_column', 'target')
    date_col = mapping.get('date_column', 'date')
    entity_col = mapping.get('entity_column', 'entity')

    # Validate mapped columns exist; if not, auto-detect from the dataframe
    if target_col not in df.columns or date_col not in df.columns or entity_col not in df.columns:
        auto = DatasetProfile(df).suggest_mapping()
        target_col = target_col if target_col in df.columns else auto['target_column']
        date_col = date_col if date_col in df.columns else auto['date_column']
        entity_col = entity_col if entity_col in df.columns else auto['entity_column']

    df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
    df = df.dropna(subset=[date_col, target_col, entity_col]).copy()
    df = df.sort_values([entity_col, date_col]).reset_index(drop=True)

    # Build per-entity timeseries
    # ISO week year (%G) keeps weeks intact across calendar-year boundaries;
    # %Y-W%V would split e.g. Dec 28 2020 - Jan 3 2021 into two fake weeks.
    df['week_key'] = df[date_col].dt.strftime('%G-W%V')
    week_keys = sorted(df['week_key'].unique())

    # Optional: limit how much history the pipeline uses (keeps the most recent N weeks)
    data_limit_weeks = mapping.get('data_limit_weeks')
    if data_limit_weeks:
        try:
            data_limit_weeks = int(data_limit_weeks)
        except (TypeError, ValueError):
            data_limit_weeks = 0
        if data_limit_weeks > 0 and len(week_keys) > data_limit_weeks:
            keep = set(week_keys[-data_limit_weeks:])
            df = df[df['week_key'].isin(keep)].copy()
            week_keys = sorted(keep)

    week_labels = {}
    for wk in week_keys:
        try:
            year, wnum = wk.split('-W')
            d = datetime.strptime(f'{year}-W{wnum}-1', '%G-W%V-%u')
            week_labels[wk] = d.strftime('%b %d')
        except Exception:
            week_labels[wk] = wk

    skus = []
    sku_detail_map = {}

    # Real price/promo columns when present in the uploaded file
    lower_cols = {c: str(c).lower() for c in df.columns}
    price_col = None
    promo_col = None
    for c, cl in lower_cols.items():
        if price_col is None and any(k in cl for k in ('price', 'list_price', 'unit_price')):
            price_col = c
        if promo_col is None and any(k in cl for k in ('promo', 'is_promo', 'promotion')):
            promo_col = c

    for idx, (entity, grp) in enumerate(df.groupby(entity_col), 1):
        grp = grp.sort_values(date_col)
        agg_dict = {target_col: 'sum'}
        if price_col is not None and price_col in grp.columns:
            agg_dict[price_col] = 'mean'
        weekly = grp.groupby('week_key', as_index=False).agg(agg_dict)
        weekly = weekly.sort_values('week_key')
        values = weekly[target_col].astype(float).tolist()
        if len(values) < 2:
            continue
        mean_val = float(np.mean(values))
        tail = values[-8:] if len(values) >= 8 else values

        # Real price history (carried forward over missing weeks) + promo weeks
        price_history = None
        promotion_weeks = 0
        if price_col is not None and price_col in weekly.columns:
            price_history = []
            last_price = None
            for p in weekly[price_col].astype(float).tolist():
                if p == p:
                    last_price = p
                price_history.append(float(last_price) if last_price is not None else None)
            price_history = [p for p in price_history if p is not None] or None
        if promo_col is not None and promo_col in grp.columns:
            promotion_weeks = int(grp.groupby('week_key')[promo_col].max().gt(0).sum())

        # Real demand pattern + backtested accuracy from the actual model
        # (not the naive baseline, not random placeholders)
        from forecast_engine import (detect_demand_pattern, backtest,
                                     forecast_for_pattern, compute_inventory_stats)
        pattern = detect_demand_pattern(values)
        bt = backtest(values, n_splits=4, horizon=8)
        p50_next = forecast_for_pattern(values, pattern, 12)['p50'][0]
        cfg = m5_data.get_app_config()
        inv = compute_inventory_stats(values,
                                      lead_time_days=cfg.get('defaultLeadTime', 14),
                                      service_level_target=cfg.get('serviceLevelTarget', 97.5),
                                      sell_price=price_history[-1] if price_history else None,
                                      moq=cfg.get('moq', 0))
        model_name = {
            'Seasonal': 'Holt-Winters',
            'Intermittent': 'Croston',
            'Erratic': 'ETS',
            'Smooth': 'ETS',
        }.get(pattern, 'ETS')

        sku_entry = {
            "id": f"sku-{idx:03d}",
            "skuId": str(entity),
            "name": str(entity),
            "category": "Uploaded Data",
            "location": "Uploaded Dataset",
            "mape": bt['mape'],
            "bias": bt['bias'],
            "p50Forecast": round(float(p50_next), 1),
            "reorderQty": inv['reorderQty'],
            "safetyStock": inv['safetyStock'],
            "model": model_name,
            "pattern": pattern,
            "lastActual": float(values[-1]),
            "trend": [float(v) for v in tail],
            "fullTrend": [float(v) for v in values],
            "sellPrice": float(price_history[-1]) if price_history else None,
            "priceHistory": price_history,
            "events": None,
            "promotionWeeks": promotion_weeks,
        }
        skus.append(sku_entry)
        sku_detail_map[sku_entry['id']] = sku_entry

    forecast_timeseries = []
    for wk in week_keys:
        wk_data = df[df['week_key'] == wk]
        total = float(wk_data[target_col].sum())
        forecast_timeseries.append({
            "week": week_labels.get(wk, wk),
            "actual": total,
            "p50": None,
            "p10": None,
            "p90": None,
        })

    # Snapshot dataset structure for the maturity assessment modules
    features = _detect_column_features(list(df.columns))
    total_rows = int(len(df))
    null_rate = round(float(df[target_col].isna().mean()), 4) if target_col in df.columns else 0.0
    n_weeks = len(week_keys)
    DATASET_PROFILE.update({
        'filename': filename,
        'columns': [str(c) for c in df.columns],
        'rows': total_rows,
        'null_rate': null_rate,
        'granularity': _detect_granularity(df, date_col),
        'n_weeks': n_weeks,
        'entities': len(skus),
        'date_from': df[date_col].min().strftime('%Y-%m-%d') if date_col in df.columns else None,
        'date_to': df[date_col].max().strftime('%Y-%m-%d') if date_col in df.columns else None,
        **features,
    })

    # Replace m5_data module globals with user data
    m5_data.SKUS = skus
    m5_data.SKU_DETAIL_MAP = sku_detail_map
    m5_data.WEEK_KEYS = week_keys
    m5_data.WEEK_LABELS = week_labels
    m5_data.N_SKUS = len(skus)
    m5_data.CATEGORIES = [{"category": "Uploaded Data", "mape": round(float(np.mean([s['mape'] for s in skus])), 1), "skus": len(skus)}]
    m5_data.FORECAST_TIMESERIES = forecast_timeseries
    m5_data.LOCATIONS = ["Uploaded Dataset"]
    # Exceptions get the actual date of the anomalous week
    week_dates = {wk: ts.to_pydatetime() for wk, ts in df.groupby('week_key')[date_col].max().items()}
    # Partial calendar weeks (e.g. ISO W53, or the tail of the file) carry fewer than
    # 3 days of data and produce fake "demand drop" signals — exclude them.
    week_day_counts = df.groupby('week_key')[date_col].nunique().to_dict()
    # Keep the calendar metadata so exception detection can be re-run whenever
    # the exception threshold changes in the configuration panel.
    m5_data.USER_DATASET_META = {
        'week_keys': week_keys,
        'week_dates': week_dates,
        'week_day_counts': week_day_counts,
    }
    m5_data.EXCEPTIONS = _build_user_exceptions(skus, week_order=week_keys, week_dates=week_dates,
                                                week_day_counts=week_day_counts)
    m5_data.EXCEPTIONS_STORE = {e['id']: e for e in m5_data.EXCEPTIONS}
    # Invalidate stale demo state — everything is recomputed from the uploaded data
    m5_data.FORECAST_CACHE.clear()
    m5_data.BACKTEST_CACHE.clear()
    m5_data.KPI_SUMMARY = {}
    m5_data.MODEL_METRICS = []
    m5_data.MODEL_COMPARISON = []
    m5_data.BACKTEST_RESULTS = {}
    m5_data.ACCURACY_HISTORY = []
    m5_data._initialized = True


def _build_user_exceptions(skus: list[dict], week_order: list | None = None,
                           week_dates: dict | None = None, week_day_counts: dict | None = None,
                           max_exceptions: int = 20) -> list[dict]:
    """Detect real exceptions from uploaded SKU demand series."""
    from datetime import datetime, timezone

    severity_order = {'high': 0, 'medium': 1, 'low': 2}
    candidates = []

    def _is_partial_week(idx: int) -> bool:
        """True when the week carries fewer than 3 days of data (calendar artifact)."""
        if not week_day_counts or not week_order or not (0 <= idx < len(week_order)):
            return False
        return int(week_day_counts.get(week_order[idx], 0) or 0) < 3

    for sku in skus:
        values = sku.get('fullTrend') or sku.get('trend') or []
        if len(values) < 12:
            continue

        sku_ref = {"sku": sku['id'], "skuId": sku['skuId'], "name": sku['name']}

        # 1. Demand spike/drop: any week deviating strongly from its 8-week baseline
        for i in range(8, len(values)):
            if _is_partial_week(i):
                continue
            baseline = float(np.median(values[i - 8:i]))
            if baseline <= 0:
                continue
            ratio = values[i] / baseline
            if ratio > 1.8:
                candidates.append({
                    **sku_ref,
                    "type": "demand-spike",
                    "severity": "high" if ratio > 3.0 else "medium",
                    "spikeMultiple": round(ratio, 1),
                    "_week": i,
                })
            elif ratio < 0.6:
                candidates.append({
                    **sku_ref,
                    "type": "demand-drop",
                    "severity": "high" if ratio < 0.4 else "medium",
                    "dropRatio": round(ratio, 2),
                    "_week": i,
                })

        # 2. Stockout risk: demand accelerating vs safety stock coverage
        recent = float(np.mean(values[-4:])) if len(values) >= 4 else float(values[-1])
        prior = float(np.mean(values[-8:-4])) if len(values) >= 8 else recent
        if prior > 0 and recent > prior * 1.4:
            safety = sku.get('safetyStock') or 0
            days = int(round(safety / max(recent, 1) * 7))
            candidates.append({
                **sku_ref,
                "type": "stockout-risk",
                "severity": "high" if days < 5 else "medium",
                "daysToStockout": max(days, 1),
                "_week": len(values) - 1,
            })

        # 3. High MAPE from the real backtest computed at load time
        mape = sku.get('mape') or 0
        threshold = m5_data.get_app_config().get('exceptionThreshold', 25)
        if mape > threshold:
            candidates.append({
                **sku_ref,
                "type": "high-mape",
                "severity": "high" if mape > threshold * 1.4 else "medium",
                "mape": round(float(mape), 1),
                "_week": len(values) - 1,
            })

    if not candidates:
        return []

    # Prioritize High severity, then the most recent anomalies
    candidates.sort(key=lambda c: (severity_order.get(c['severity'], 2), -c['_week']))
    candidates = candidates[:max_exceptions]

    if week_dates and week_order:
        try:
            stamp = week_dates.get(week_order[0]) or datetime.now(timezone.utc)
        except Exception:
            stamp = datetime.now(timezone.utc)
    else:
        stamp = datetime.now(timezone.utc)

    exceptions = []
    for i, c in enumerate(candidates):
        if week_dates and week_order and 0 <= c['_week'] < len(week_order):
            exc_stamp = week_dates.get(week_order[c['_week']]) or stamp
        else:
            exc_stamp = stamp
        entry = {
            "id": f"exc-{i + 1:03d}",
            "sku": c['sku'],
            "skuId": c['skuId'],
            "name": c['name'],
            "type": c['type'],
            "mape": None,
            "daysToStockout": None,
            "spikeMultiple": None,
            "dropRatio": None,
            "severity": c['severity'],
            "status": "open",
            "timestamp": exc_stamp.isoformat(),
        }
        if c['type'] == 'high-mape':
            entry['mape'] = c['mape']
        elif c['type'] == 'stockout-risk':
            entry['daysToStockout'] = c['daysToStockout']
        elif c['type'] == 'demand-spike':
            entry['spikeMultiple'] = c['spikeMultiple']
        elif c['type'] == 'demand-drop':
            entry['dropRatio'] = c['dropRatio']
        exceptions.append(entry)
    return exceptions


def forecast_from_mapping(file_bytes: bytes, filename: str, mapping: dict[str, Any]) -> dict[str, Any]:
    if filename.endswith('.csv'):
        dataframe = pd.read_csv(io.BytesIO(file_bytes))
    elif filename.endswith(('.xlsx', '.xls')):
        dataframe = pd.read_excel(io.BytesIO(file_bytes))
    else:
        raise ValueError('Unsupported file type. Please upload CSV or Excel.')

    target_column = mapping.get('target_column')
    date_column = mapping.get('date_column')
    entity_column = mapping.get('entity_column')
    forecast_horizon = int(mapping.get('forecast_horizon', 4))

    if not target_column or not date_column or not entity_column:
        raise ValueError('Mapping must include target, date, and entity columns.')

    dataframe[date_column] = pd.to_datetime(dataframe[date_column], errors='coerce')
    dataframe = dataframe.dropna(subset=[date_column, target_column, entity_column]).copy()
    dataframe = dataframe.sort_values([entity_column, date_column]).reset_index(drop=True)

    series = []
    for entity, group in dataframe.groupby(entity_column):
        ordered = group.sort_values(date_column)
        values = ordered[target_column].astype(float).tolist()
        if len(values) < 2:
            continue
        last_value = float(values[-1])
        future_values = [max(0.0, last_value + (i * 0.1 * last_value)) for i in range(forecast_horizon)]
        actual_values = values[-min(len(values), 3):]
        series.append({
            'entity': str(entity),
            'actual': actual_values[-1] if actual_values else None,
            'forecast': future_values,
        })

    return {
        'series': series,
        'target_column': target_column,
        'date_column': date_column,
        'entity_column': entity_column,
    }
