"""
Data & Analytics Maturity assessment module.

Evaluates what data the client has vs. what a demand-forecasting platform needs,
scores data maturity per dimension, derives which analytics capabilities are
available with the current data, quantifies the gap, and recommends actions.
"""
from typing import Any

from data import m5_data
from generic_dataset import DATASET_PROFILE

WEIGHT = {'essential': 3, 'important': 2, 'nice': 1}

DIMENSIONS: list[dict[str, Any]] = [
    {
        'id': 'demand_history',
        'name': 'Demand / Sales History',
        'importance': 'essential',
        'description': 'Historical demand or sales records — the core input for any forecast.',
    },
    {
        'id': 'date_calendar',
        'name': 'Date / Calendar Field',
        'importance': 'essential',
        'description': 'A valid date or period field to anchor the time series.',
    },
    {
        'id': 'history_depth',
        'name': 'History Depth',
        'importance': 'essential',
        'description': 'Length of history. 2+ years allows reliable seasonality detection.',
    },
    {
        'id': 'granularity',
        'name': 'Data Granularity',
        'importance': 'important',
        'description': 'Daily or weekly records capture short-term demand movements.',
    },
    {
        'id': 'entity_hierarchy',
        'name': 'Product / SKU Hierarchy',
        'importance': 'essential',
        'description': 'Product identifiers (and optionally category/family) to build per-SKU series.',
    },
    {
        'id': 'location_hierarchy',
        'name': 'Location / Store Hierarchy',
        'importance': 'important',
        'description': 'Store or warehouse identifiers for location-level forecasts.',
    },
    {
        'id': 'price_history',
        'name': 'Price History',
        'importance': 'important',
        'description': 'Selling price over time — required for price elasticity and promo uplift.',
    },
    {
        'id': 'promotions',
        'name': 'Promotions & Events',
        'importance': 'important',
        'description': 'Promotion flags or event calendar to separate true demand from promotional spikes.',
    },
    {
        'id': 'inventory_data',
        'name': 'Inventory & Stock Levels',
        'importance': 'nice',
        'description': 'Stock on hand / availability — required for inventory optimization.',
    },
    {
        'id': 'supply_leadtime',
        'name': 'Supply Lead Times',
        'importance': 'nice',
        'description': 'Supplier or replenishment lead times for reorder policy design.',
    },
    {
        'id': 'external_signals',
        'name': 'External Factors',
        'importance': 'nice',
        'description': 'Weather, macro, or market signals to explain demand beyond the product itself.',
    },
    {
        'id': 'data_completeness',
        'name': 'Data Completeness & Quality',
        'importance': 'important',
        'description': 'Missing values and gaps in the demand series.',
    },
]

CAPABILITIES: list[dict[str, Any]] = [
    {
        'id': 'baseline_forecast',
        'name': 'Statistical Forecasting',
        'description': 'ETS / ARIMA / seasonal naive baselines per SKU.',
        'requires': ['demand_history', 'date_calendar', 'history_depth'],
        'value': 'Foundational forecast accuracy for all downstream planning.',
    },
    {
        'id': 'ml_forecast',
        'name': 'ML Forecasting (LightGBM / Prophet)',
        'description': 'Gradient-boosted and probabilistic models with automatic model selection.',
        'requires': ['demand_history', 'date_calendar', 'history_depth', 'entity_hierarchy'],
        'value': '5–15pp accuracy gain over baselines on rich history.',
    },
    {
        'id': 'seasonality',
        'name': 'Seasonality & Decomposition',
        'description': 'Yearly/weekly seasonal profiles, trend decomposition, calendar effects.',
        'requires': ['history_depth'],
        'value': 'Smarter safety stock by season and promotion calendar alignment.',
    },
    {
        'id': 'demand_sensing',
        'name': 'Demand Sensing (Short Horizon)',
        'description': 'Daily point-of-sale signals blended into the forecast horizon.',
        'requires': ['demand_history', 'granularity'],
        'value': 'Up to 30% error reduction on the next 1–4 weeks.',
    },
    {
        'id': 'promo_analytics',
        'name': 'Promotion-Aware Forecasting',
        'description': 'Forecast uplift for each promotion event instead of one global lift.',
        'requires': ['demand_history', 'promotions', 'price_history'],
        'value': 'Accurate promotional ROI and post-promo dip handling.',
    },
    {
        'id': 'price_elasticity',
        'name': 'Price Elasticity Modeling',
        'description': 'Quantify how price changes move demand; optimize pricing decisions.',
        'requires': ['price_history'],
        'value': 'Optimized price points without sacrificing volume.',
    },
    {
        'id': 'exceptions',
        'name': 'Exception Monitoring & Alerts',
        'description': 'Auto-detected demand spikes, drops, stockout risk, and high-MAPE SKUs.',
        'requires': ['demand_history', 'entity_hierarchy'],
        'value': 'Priority list of SKUs needing planner attention.',
    },
    {
        'id': 'hierarchical',
        'name': 'Hierarchical Forecasting',
        'description': 'Bottom-up / top-down reconciliation across category and location levels.',
        'requires': ['entity_hierarchy', 'location_hierarchy'],
        'value': 'Consistent numbers from category down to store level.',
    },
    {
        'id': 'inventory',
        'name': 'Inventory Optimization',
        'description': 'Safety stock, reorder points, and service-level-driven stock policies.',
        'requires': ['demand_history', 'inventory_data', 'supply_leadtime'],
        'value': '10–25% inventory reduction at equal service levels.',
    },
    {
        'id': 'simulation',
        'name': 'Scenario & What-If Simulation',
        'description': 'Stress-test forecasts under price, promo, and supply scenarios.',
        'requires': ['demand_history', 'price_history'],
        'value': 'Data-backed decisions for trade terms and launches.',
    },
    {
        'id': 'consensus',
        'name': 'Consensus & Collaborative Planning',
        'description': 'Planner overrides, annotations, and workflow around the baseline forecast.',
        'requires': ['entity_hierarchy'],
        'value': 'Planner trust and forecast ownership.',
    },
    {
        'id': 'external',
        'name': 'External Factor Modeling',
        'description': 'Weather, macro, and market regressors in the forecast model.',
        'requires': ['external_signals'],
        'value': 'Explains demand drivers outside the product itself.',
    },
]

RECOMMENDATION_BY_DIMENSION: dict[str, dict[str, str]] = {
    'price_history': {
        'title': 'Provide price history',
        'action': 'Add a "price" column with the selling price per product per period (e.g. price = 12.50).',
        'example': 'price / unit_price / mrp',
    },
    'promotions': {
        'title': 'Provide promotion calendar',
        'action': 'Add a promo flag (0/1) or promotion name per product per week, or share the trade calendar.',
        'example': 'promo_flag, discount_pct, campaign_id',
    },
    'inventory_data': {
        'title': 'Share stock level snapshots',
        'action': 'Provide end-of-week stock on hand per product per location (e.g. stock = 340).',
        'example': 'stock_on_hand, inventory_qty, available',
    },
    'supply_leadtime': {
        'title': 'Share supplier lead times',
        'action': 'Provide average lead time per product or supplier in days (e.g. lead_time = 14).',
        'example': 'lead_time, replenishment_days',
    },
    'external_signals': {
        'title': 'Add external factor data',
        'action': 'Attach weather (temperature/rainfall), macro (GDP, inflation), or market indices aligned by week.',
        'example': 'temperature, rainfall_mm, inflation_pct',
    },
    'location_hierarchy': {
        'title': 'Add store / location identifiers',
        'action': 'Include a store or warehouse column so forecasts can be built per location.',
        'example': 'store_id, location, warehouse',
    },
    'granularity': {
        'title': 'Move from monthly to weekly (or daily) data',
        'action': 'Share records at weekly or daily frequency so short-term demand shifts can be modeled.',
        'example': 'One row per product per day / week',
    },
    'history_depth': {
        'title': 'Extend history to 2+ years',
        'action': 'Backfill older records — at least 104 weeks are needed for reliable yearly seasonality.',
        'example': 'Minimum 26 weeks to start, 104 weeks recommended',
    },
    'data_completeness': {
        'title': 'Clean missing values and gaps',
        'action': 'Fill missing demand records (use 0 for no-sales weeks) and remove duplicate rows.',
        'example': 'One row per product per period, no gaps',
    },
    'entity_hierarchy': {
        'title': 'Add product categories / families',
        'action': 'Add a category or family column so forecasts can roll up and reconcile.',
        'example': 'category, family, brand, dept',
    },
}


def _get_profile() -> dict[str, Any]:
    """Profile of the currently loaded dataset (uploaded, or the M5 demo)."""
    if DATASET_PROFILE:
        return DATASET_PROFILE

    # Fallback: derive from the default M5 demo data
    m5_data._lazy_init()
    n_weeks = len(m5_data.WEEK_KEYS)
    return {
        'filename': 'M5 retail demo dataset',
        'columns': ['id', 'item_id', 'store_id', 'date', 'sales', 'price', 'events'],
        'rows': len(m5_data.SKUS) * n_weeks,
        'null_rate': 0.0,
        'granularity': 'weekly',
        'n_weeks': n_weeks,
        'entities': m5_data.N_SKUS,
        'date_from': m5_data.WEEK_KEYS[0] if m5_data.WEEK_KEYS else None,
        'date_to': m5_data.WEEK_KEYS[-1] if m5_data.WEEK_KEYS else None,
        'has_price': True,
        'has_promo': True,
        'has_inventory': False,
        'has_leadtime': False,
        'has_external': False,
        'has_location': True,
        'has_category': True,
    }


def _score_history(n_weeks: int) -> tuple[float, str]:
    if n_weeks >= 104:
        return 100.0, f'{n_weeks} weeks of history (≈{round(n_weeks / 52, 1)} years)'
    if n_weeks >= 52:
        return 70.0, f'{n_weeks} weeks — good start, 2+ years recommended'
    if n_weeks >= 26:
        return 40.0, f'{n_weeks} weeks — enough for baselines, seasonality unreliable'
    return 10.0, f'Only {n_weeks} weeks — too short for reliable forecasts'


def _score_dimensions(profile: dict[str, Any]) -> list[dict[str, Any]]:
    """Score each data dimension 0–100 based on the dataset profile."""
    dims: list[dict[str, Any]] = []

    def add(dim_id: str, score: float, status: str, evidence: str, note: str = '') -> None:
        meta = next(d for d in DIMENSIONS if d['id'] == dim_id)
        dims.append({
            **meta,
            'score': round(float(score), 1),
            'status': status,
            'evidence': evidence,
            'note': note,
        })

    n_weeks = profile.get('n_weeks', 0)
    has_history = profile.get('rows', 0) > 0

    # demand_history
    if has_history:
        add('demand_history', 100, 'complete',
            f'Demand records found — {profile.get("rows", 0):,} rows in {profile.get("filename", "dataset")}.')
    else:
        add('demand_history', 0, 'missing', 'No demand or sales data found.')

    # date_calendar
    if profile.get('date_from'):
        add('date_calendar', 100, 'complete',
            f'Valid date field — range {profile.get("date_from")} → {profile.get("date_to")}.')
    else:
        add('date_calendar', 0, 'missing', 'No usable date or period field found.')

    # history_depth
    if has_history:
        score, evidence = _score_history(n_weeks)
        add('history_depth', score, 'complete' if score >= 90 else 'partial' if score >= 40 else 'missing', evidence)

    # granularity
    g = profile.get('granularity', 'weekly')
    gran_score = {'daily': 100, 'weekly': 70, 'monthly': 40}.get(g, 50)
    add('granularity', gran_score,
        'complete' if gran_score >= 90 else 'partial',
        f'{g.capitalize()} records — {"ideal for demand sensing" if g == "daily" else "weekly is workable, daily unlocks sensing" if g == "weekly" else "monthly hides short-term demand"}.')

    # entity_hierarchy
    if profile.get('entities', 0) > 0:
        cat_note = ' · category column detected' if profile.get('has_category') else ' · no category column'
        add('entity_hierarchy', 100, 'complete',
            f'{profile.get("entities", 0):,} product entities' + cat_note)
    else:
        add('entity_hierarchy', 0, 'missing', 'No product / SKU identifiers found.')

    # location_hierarchy
    if profile.get('has_location'):
        add('location_hierarchy', 100, 'complete', 'Store / location identifiers detected.')
    else:
        add('location_hierarchy', 0, 'missing',
            'No store or location column — forecasts are national / aggregate level only.')

    # price_history
    if profile.get('has_price'):
        add('price_history', 100, 'complete', 'Price column detected — elasticity and promo uplift possible.')
    else:
        add('price_history', 0, 'missing',
            'No price history — promotional and pricing analytics are not available.')

    # promotions
    if profile.get('has_promo'):
        add('promotions', 100, 'complete', 'Promotion flags / event columns detected.')
    else:
        add('promotions', 0, 'missing',
            'No promotion calendar — promo spikes cannot be separated from true demand.')

    # inventory_data
    if profile.get('has_inventory'):
        add('inventory_data', 100, 'complete', 'Stock level columns detected.')
    else:
        add('inventory_data', 0, 'missing', 'No inventory data — optimization module cannot run.')

    # supply_leadtime
    if profile.get('has_leadtime'):
        add('supply_leadtime', 100, 'complete', 'Lead time fields detected.')
    else:
        add('supply_leadtime', 0, 'missing', 'No lead time data — reorder policies use defaults.')

    # external_signals
    if profile.get('has_external'):
        add('external_signals', 100, 'complete', 'External factor columns detected.')
    else:
        add('external_signals', 0, 'missing', 'No weather / macro data attached.')

    # data_completeness
    null_rate = profile.get('null_rate', 0.0)
    if null_rate > 0.05:
        add('data_completeness', 40, 'partial',
            f'{round(null_rate * 100, 1)}% of demand values missing — gaps will be interpolated.')
    elif null_rate > 0.0:
        add('data_completeness', 80, 'partial',
            f'{round(null_rate * 100, 1)}% missing values — acceptable but worth cleaning.')
    else:
        add('data_completeness', 100, 'complete', 'No missing demand values detected.')

    return dims


def _overall(dims: list[dict[str, Any]]) -> float:
    total_w = sum(WEIGHT[d['importance']] for d in dims)
    return round(sum(d['score'] * WEIGHT[d['importance']] for d in dims) / total_w, 1)


def _level(score: float) -> str:
    if score >= 75:
        return 'Mature'
    if score >= 50:
        return 'Developing'
    if score >= 25:
        return 'Emerging'
    return 'Initial'


def compute_data_maturity() -> dict[str, Any]:
    profile = _get_profile()
    dims = _score_dimensions(profile)
    overall = _overall(dims)
    summary_parts = []
    missing = [d for d in dims if d['status'] == 'missing']
    partial = [d for d in dims if d['status'] == 'partial']
    if not missing and not partial:
        summary_parts.append('You have all the data we need for core forecasting.')
    else:
        if missing:
            summary_parts.append(f"{len(missing)} required inputs are missing ({', '.join(d['name'] for d in missing[:3])}{'…' if len(missing) > 3 else ''}).")
        if partial:
            summary_parts.append(f"{len(partial)} inputs are partial ({', '.join(d['name'] for d in partial[:2])}{'…' if len(partial) > 2 else ''}).")
        summary_parts.append('Closing these unlocks more advanced analytics.')
    return {
        'overallScore': overall,
        'level': _level(overall),
        'levels': ['Initial', 'Emerging', 'Developing', 'Mature'],
        'dimensions': dims,
        'summary': ' '.join(summary_parts),
        'datasetSummary': {
            'filename': profile.get('filename'),
            'columns': profile.get('columns', []),
            'rows': profile.get('rows', 0),
            'granularity': profile.get('granularity'),
            'nWeeks': profile.get('n_weeks', 0),
            'entities': profile.get('entities', 0),
            'dateFrom': profile.get('date_from'),
            'dateTo': profile.get('date_to'),
        },
    }


def compute_analytics_maturity() -> dict[str, Any]:
    profile = _get_profile()
    dims = _score_dimensions(profile)
    dim_scores = {d['id']: d['score'] for d in dims}
    dim_status = {d['id']: d['status'] for d in dims}

    capabilities = []
    for cap in CAPABILITIES:
        req_scores = [dim_scores.get(r, 0) for r in cap['requires']]
        missing_reqs = [r for r, s in zip(cap['requires'], req_scores) if s < 50]
        partial_reqs = [r for r, s in zip(cap['requires'], req_scores) if 50 <= s < 90]
        score = round(float(sum(req_scores) / len(req_scores)) if req_scores else 0, 1)

        if not missing_reqs and not partial_reqs:
            status = 'ready'
        elif not missing_reqs:
            status = 'partial'
        else:
            status = 'blocked'

        capabilities.append({
            'id': cap['id'],
            'name': cap['name'],
            'description': cap['description'],
            'value': cap['value'],
            'status': status,
            'score': score,
            'missingData': [
                {
                    'dimension': r,
                    'name': next(d['name'] for d in DIMENSIONS if d['id'] == r),
                }
                for r in missing_reqs
            ],
        })

    # Gap → recommendations (only for non-ready capabilities, dedup by dimension)
    recommendations = []
    used_dims = set()
    for cap in capabilities:
        if cap['status'] == 'ready':
            continue
        for gap in cap['missingData']:
            if gap['dimension'] in used_dims:
                continue
            used_dims.add(gap['dimension'])
            rec = RECOMMENDATION_BY_DIMENSION.get(gap['dimension'], {})
            if not rec:
                continue
            priority = 'P1' if dim_status.get(gap['dimension']) == 'missing' else 'P2'
            rec_impact = _impact_by_capability(cap['id'])
            recommendations.append({
                'id': f'rec-{len(recommendations) + 1:02d}',
                'priority': priority,
                'title': rec['title'],
                'action': rec['action'],
                'example': rec.get('example'),
                'dimension': gap['dimension'],
                'dimensionName': gap['name'],
                'unlocks': cap['name'],
                'impact': rec_impact,
                'effort': _effort(gap['dimension']),
            })

    ready_count = sum(1 for c in capabilities if c['status'] == 'ready')
    partial_count = sum(1 for c in capabilities if c['status'] == 'partial')
    blocked_count = sum(1 for c in capabilities if c['status'] == 'blocked')
    overall = round(float(sum(c['score'] for c in capabilities) / len(capabilities)), 1) if capabilities else 0

    summary = (
        f'With your current data you can run {ready_count} of {len(capabilities)} analytics capabilities today. '
        f'{partial_count} work in a limited form and {blocked_count} are unavailable. '
        f'Completing the {len(used_dims)} missing inputs unlocks the full suite.'
    )

    return {
        'overallScore': overall,
        'level': _level(overall),
        'capabilities': capabilities,
        'recommendations': recommendations,
        'summary': summary,
        'counts': {'ready': ready_count, 'partial': partial_count, 'blocked': blocked_count},
    }


def _impact_by_capability(cap_id: str) -> str:
    impacts = {
        'promo_analytics': 'Higher promo ROI, fewer stockouts during events',
        'price_elasticity': 'Price decisions backed by elasticity curves',
        'inventory': '10–25% lower stock at same service level',
        'demand_sensing': 'Up to 30% error cut on short horizon',
        'hierarchical': 'Consistent category → store planning',
        'external': 'Weather / macro-aware forecasts',
        'ml_forecast': '5–15pp accuracy gain over baselines',
        'seasonality': 'Seasonal safety stock profiles',
        'simulation': 'Data-backed what-if decisions',
        'baseline_forecast': 'Foundational accuracy for planning',
        'exceptions': 'Priority exception list for planners',
        'consensus': 'Planner trust and ownership',
    }
    return impacts.get(cap_id, 'Improved forecast value')


def _effort(dimension: str) -> str:
    return {
        'data_completeness': 'Low',
        'granularity': 'Medium',
        'history_depth': 'Medium',
        'entity_hierarchy': 'Low',
        'price_history': 'Low',
        'promotions': 'Low',
        'external_signals': 'High',
        'inventory_data': 'High',
        'supply_leadtime': 'Low',
        'location_hierarchy': 'Low',
    }.get(dimension, 'Medium')
