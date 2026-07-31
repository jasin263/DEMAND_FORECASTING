"""
Mock data for ForecastIQ backend.
Contains all the static data that was previously in Next.js API routes.
"""
from datetime import datetime, timezone, timedelta
import random
import math

random.seed(42)

_NOW = datetime(2026, 7, 23, tzinfo=timezone.utc)

# ──────────────────────────────────────────────
# Helper: generate realistic SKU catalog
# ──────────────────────────────────────────────
CATEGORIES = {
    "Beverages": ["Nescafé Classic 200g", "Nescafé Sunrise 100g", "Nescafé Gold Blend 50g",
                  "Milo Active Go 1kg", "Milo UHT 180ml", "Nestea Lemon 1L", "Nestea Peach 500ml",
                  "Nestea Green Tea 1L", "Nescafé Cappuccino Sachet 10x15g", "Nescafé Latte Sachet 10x18g",
                  "Boost Energy Drink 200ml", "Horlicks Chocolate 500g", "Horlicks Classic 500g",
                  "Bournvita 750g", "Complan Kesar Badam 400g", "Nescafé Decaf 100g"],
    "Dairy": ["Milkmaid Condensed 400g", "Amul Butter 500g", "Amul Cheese Slices 200g",
              "Amul Ghee 1L", "Amul Mithai Mate 300g", "Amul Fresh Cream 200ml",
              "Amul Kool Flavoured Milk 180ml", "Amul Lassi 200ml", "Amul Shrikhand 500g",
              "Mother Dairy Dahi 400g", "Mother Dairy Paneer 200g", "Britannia Cheese Block 200g"],
    "Snacks": ["KitKat 4-Finger 41.5g", "KitKat Chunky 48g", "KitKat Dark 100g",
               "Munch 30g", "Munch Max 50g", "Perk 37g", "Perk XL 58g",
               "Kurkure Masala 80g", "Kurkure Puffcorn 70g", "Lay's American Style 52g",
               "Lay's Magic Masala 52g", "Doritos Cheese 85g", "Cheetos 55g",
               "Uncle Chipps Spicy 60g", "Bingo Mad Angles 70g", "Haldiram's Bhujia 200g"],
    "Frozen": ["Maggi Masala Noodles 70g", "Maggi Vegetable Noodles 140g", "Maggi 2-Minute Cup 65g",
               "Maggi Cuppa Masala 60g", "Yippee Noodles 70g", "Top Ramen Curry 70g",
               "Maggi Pazzta Italian 70g", "Maggi Pazzta Cheesey 70g", "Maggi Veg Atta Noodles 75g",
               "MTR Rava Idli Mix 500g", "MTR Dosa Mix 500g", "Gits Pizza Base 250g"],
    "Personal Care": ["Dove Body Wash 250ml", "Dove Shampoo 200ml", "Dove Conditioner 200ml",
                      "Dove Soap Bar 100g x3", "Dove Deodorant 150ml", "Dove Face Wash 100ml",
                      "Sunsilk Shampoo 180ml", "Sunsilk Conditioner 180ml", "Clinic Plus Shampoo 200ml",
                      "Lifebuoy Soap 125g x4", "Lifebuoy Handwash 250ml", "Lux Soap 100g x3",
                      "Pears Soap 100g x2", "Ponds Face Wash 100g", "Vaseline Lotion 200ml",
                      "Fair & Lovely Cream 50g"],
    "Condiments": ["Maggi Hot & Sweet 500g", "Maggi Tomato Chilli 500g", "Maggi Soya Sauce 200ml",
                   "Maggi Chilli Sauce 200ml", "Maggi Noodle Masala 10x6g", "Kissan Ketchup 1kg",
                   "Kissan Mixed Fruit Jam 500g", "Kissan Pineapple Jam 500g", "Patanjali Desi Ghee 1L",
                   "Patanjali Honey 500g", "Dabur Honey 500g", "MDH Garam Masala 100g",
                   "Everest Red Chilli Powder 100g", "Tata Salt 1kg", "Catch Black Pepper 100g"],
    "Rice & Grains": ["Basmati Rice 1kg", "Basmati Rice Premium 5kg", "Sona Masoori Rice 5kg",
                      "Toor Dal 1kg", "Moong Dal 1kg", "Chana Dal 1kg", "Urad Dal 1kg",
                      "Wheat Flour (Atta) 5kg", "Wheat Flour (Atta) 10kg", "Maida 1kg",
                      "Sooji (Semolina) 500g", "Poha (Flattened Rice) 1kg"],
    "Oils & Ghee": ["Fortified Sunflower Oil 1L", "Fortified Sunflower Oil 5L",
                    "Groundnut Oil 1L", "Mustard Oil 1L", "Coconut Oil 500ml",
                    "Olive Oil 500ml", "Ghee (Cow) 1L", "Ghee (Buffalo) 1L"],
    "Cleaning & Household": ["Surf Excel Detergent 1kg", "Ariel Detergent 1kg", "Tide Detergent 500g",
                             "Vim Dishwash Liquid 500ml", "Pril Dishwash Gel 750ml",
                             "Harpic Toilet Cleaner 500ml", "Domex Floor Cleaner 1L",
                             "Mr Muscle Glass Cleaner 500ml", "Lizol Floor Cleaner 1L",
                             "Exo Dishwash Bar 200g x3"],
}

WAREHOUSES = [
    "WH-Mumbai-01", "WH-Delhi-02", "WH-Bangalore-03", "WH-Chennai-04",
    "WH-Kolkata-05", "WH-Hyderabad-06", "WH-Pune-07", "WH-Ahmedabad-08",
    "WH-Jaipur-09", "WH-Lucknow-10", "WH-Chandigarh-11", "WH-Bhopal-12",
]

DEMAND_PATTERNS = ["Smooth", "Seasonal", "Intermittent", "Erratic"]
FORECAST_MODELS = ["LightGBM", "ETS", "SARIMA", "Moving Avg", "Croston"]

def _generate_sku_id(category: str, idx: int) -> str:
    prefix_map = {
        "Beverages": "BEV", "Dairy": "DAI", "Snacks": "SNK", "Frozen": "FRZ",
        "Personal Care": "PC", "Condiments": "CON", "Rice & Grains": "RIC",
        "Oils & Ghee": "OIL", "Cleaning & Household": "CLN",
    }
    prefix = prefix_map.get(category, "GEN")
    return f"NES-{prefix}-{idx:04d}"

def _generate_skus() -> list[dict]:
    skus = []
    idx = 1
    for category, products in CATEGORIES.items():
        locations = random.sample(WAREHOUSES, min(len(products), len(WAREHOUSES)))
        for i, name in enumerate(products):
            mape = round(random.uniform(4.0, 42.0), 1)
            bias = round(random.uniform(-8.0, 8.0), 1)
            base_demand = random.randint(2000, 35000)
            pattern = random.choice(DEMAND_PATTERNS)
            model = random.choice(FORECAST_MODELS)
            # Heuristic: intermittent patterns suit Croston
            if pattern == "Intermittent":
                model = random.choice(["Croston", "Moving Avg"])
            reorder_qty = base_demand // 4
            safety_stock = base_demand // 10
            trend_len = random.randint(4, 8)
            trend_vals = []
            val = base_demand
            for t in range(trend_len):
                val += random.randint(-3000, 4000)
                trend_vals.append(min(max(val, 500), 50000))

            skus.append({
                "id": f"sku-{idx:03d}",
                "skuId": _generate_sku_id(category, idx),
                "name": name,
                "category": category,
                "location": locations[i % len(locations)],
                "mape": mape,
                "bias": bias,
                "p50Forecast": base_demand,
                "reorderQty": reorder_qty,
                "safetyStock": safety_stock,
                "model": model,
                "pattern": pattern,
                "lastActual": max(500, base_demand + random.randint(-2000, 2000)),
                "trend": trend_vals,
            })
            idx += 1
    return skus

SKUS = _generate_skus()  # now 60+ SKUs

# ──────────────────────────────────────────────
# Build backtest histories for every SKU
# ──────────────────────────────────────────────
BACKTEST_RUNS = ["Run 1 (Apr)", "Run 2 (May)", "Run 3 (Jun)", "Run 4 (Jul)"]

SKU_DETAIL_MAP: dict[str, dict] = {}
for sku in SKUS:
    base_mape = sku["mape"] - random.uniform(4, 10)
    SKU_DETAIL_MAP[sku["id"]] = {
        **sku,
        "backtestHistory": [
            {"run": BACKTEST_RUNS[j], "mape": round(max(3.0, base_mape + j * random.uniform(0.5, 3.0)), 1),
             "wape": round(max(2.0, sku["mape"] * 0.8 - j * 0.5 + random.uniform(-1, 1)), 1)}
            for j in range(4)
        ],
    }

# ──────────────────────────────────────────────
# KPI Summary
# ──────────────────────────────────────────────
KPI_SUMMARY = {
    "wape": 11.4,
    "wapeDelta": -1.2,
    "mape": 14.7,
    "mapeDelta": 0.8,
    "totalForecastedDemand": round(sum(s["p50Forecast"] for s in SKUS) * 12 * 1.1, -2),
    "totalForecastedDemandDelta": 4.1,
    "exceptionSkus": sum(1 for s in SKUS if s["mape"] > 25),
    "exceptionSkusDelta": 5,
    "forecastBias": -3.2,
    "serviceLevel": 96.8,
    "serviceLevelDelta": 0.4,
}

# ──────────────────────────────────────────────
# Forecast Timeseries (52 weeks with trend + seasonality)
# ──────────────────────────────────────────────
WEEK_LABELS = []
month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
# Start from Jan 1, 2026
week_num = 1
month_idx = 0
for w in range(52):
    day = 1 + (w * 7) % 28
    m = month_names[(w // 4) % 12]
    WEEK_LABELS.append(f"{m} {day}")
    if day > 25:
        day = 1
    else:
        day += 7

BASE_DEMAND = 52000
FORECAST_TIMESERIES = []
for i in range(52):
    trend = 1 + 0.005 * i
    seasonal = 1 + 0.12 * math.sin(2 * math.pi * i / 12)
    noise = 1 + random.gauss(0, 0.04)
    actual_val = round(BASE_DEMAND * trend * seasonal * noise, -2)
    forecast_val = round(BASE_DEMAND * trend * seasonal, -2)
    interval_width = 0.08 * forecast_val * (1 + i / 100)
    p10 = round(forecast_val - interval_width, -2)
    p90 = round(forecast_val + interval_width, -2)
    # Only first 40 weeks have actuals (last 12 are future forecast)
    FORECAST_TIMESERIES.append({
        "week": WEEK_LABELS[i],
        "actual": actual_val if i < 40 else None,
        "p50": forecast_val,
        "p10": p10,
        "p90": p90,
    })

# ──────────────────────────────────────────────
# Accuracy by Category (with more categories)
# ──────────────────────────────────────────────
ACCURACY_BY_CATEGORY = []
for cat, products in CATEGORIES.items():
    cat_skus = [s for s in SKUS if s["category"] == cat]
    avg_mape = round(sum(s["mape"] for s in cat_skus) / len(cat_skus), 1)
    ACCURACY_BY_CATEGORY.append({
        "category": cat,
        "mape": avg_mape,
        "skus": len(cat_skus),
    })

# ──────────────────────────────────────────────
# Exceptions (15+ entries cross-referencing SKUs)
# ──────────────────────────────────────────────
_exception_types = ["high-mape", "stockout-risk", "demand-spike"]
_exception_skus = [s for s in SKUS if s["mape"] > 18 or random.random() < 0.3]

EXCEPTIONS = []
exc_id = 1
timestamps = []
for d in range(14):
    for h in range(6):
        ts = _NOW - timedelta(days=d, hours=h * random.randint(1, 4), minutes=random.randint(0, 59))
        timestamps.append(ts.isoformat())

for i, sku in enumerate(_exception_skus[:18]):
    etype = random.choice(_exception_types)
    sev_map = {"high-mape": "High" if sku["mape"] > 28 else "Medium",
               "stockout-risk": random.choice(["High", "Medium"]),
               "demand-spike": random.choice(["Medium", "Low"])}
    entry: dict = {
        "id": f"exc-{exc_id:03d}",
        "skuId": sku["skuId"],
        "name": sku["name"],
        "type": etype,
        "mape": None,
        "daysToStockout": None,
        "spikeMultiple": None,
        "severity": sev_map.get(etype, "Medium"),
        "timestamp": timestamps[i % len(timestamps)],
    }
    if etype == "high-mape":
        entry["mape"] = sku["mape"]
    elif etype == "stockout-risk":
        entry["daysToStockout"] = random.randint(1, 14)
    elif etype == "demand-spike":
        entry["spikeMultiple"] = round(random.uniform(1.5, 4.0), 1)
    EXCEPTIONS.append(entry)
    exc_id += 1

# ──────────────────────────────────────────────
# Scenarios (12 scenarios)
# ──────────────────────────────────────────────
SCENARIOS = [
    {"id": "scn-001", "title": "Promotional Uplift — Republic Day", "detail": "Model a 20% lift in demand across Beverages and Snacks for Republic Day promotions. Expect downstream inventory pressure on WH-Delhi.", "impact": "+12.4% revenue", "status": "active", "createdAt": "2026-01-10T10:30:00Z"},
    {"id": "scn-002", "title": "Supplier Disruption — Vendor A", "detail": "Simulate a 2-week delay from the primary packaging supplier for Nescafé and Milo lines. Evaluate service risk across 4 distribution centres.", "impact": "4 SKUs at risk", "status": "active", "createdAt": "2026-02-14T14:15:00Z"},
    {"id": "scn-003", "title": "Price Elasticity — Personal Care", "detail": "Test 5% price reduction on Dove and Sunsilk ranges to estimate volume response. Based on previous elasticity coefficients.", "impact": "Forecast variance -7.8%", "status": "draft", "createdAt": "2026-03-20T09:00:00Z"},
    {"id": "scn-004", "title": "E-Commerce Channel Launch — South", "detail": "Model the demand impact of adding Flipkart and Amazon channels across Karnataka and Tamil Nadu. Includes incremental marketing spend.", "impact": "+18.2% volume", "status": "active", "createdAt": "2026-04-05T11:45:00Z"},
    {"id": "scn-005", "title": "Festival Surge — Diwali 2026", "detail": "Forecast uplift from the upcoming Diwali festival season. Assume 30% lift on Snacks, 20% on Oils & Ghee, and 15% on Beverages for 6 weeks.", "impact": "+25% demand peak", "status": "active", "createdAt": "2026-05-22T08:30:00Z"},
    {"id": "scn-006", "title": "Heatwave Scenario — Q2 2026", "detail": "Model demand surge for Beverages and Frozen categories during an extended April-May heatwave. Historical elasticity suggests 18-22% lift.", "impact": "+21.4% beverages", "status": "active", "createdAt": "2026-03-01T06:00:00Z"},
    {"id": "scn-007", "title": "New Product Introduction — KitKat Dark", "detail": "Launch KitKat Dark 100g across modern trade. Estimate cannibalisation of existing KitKat variants and net demand uplift.", "impact": "+3.2% category", "status": "draft", "createdAt": "2026-06-10T13:20:00Z"},
    {"id": "scn-008", "title": "GST Rate Change Impact", "detail": "Simulate a potential GST rate increase from 12% to 18% on Biscuits and Confectionery. Model demand contraction using recent price-elasticity data.", "impact": "-11.5% volume", "status": "archived", "createdAt": "2026-04-28T16:45:00Z"},
    {"id": "scn-009", "title": "Warehouse Consolidation", "detail": "Consolidate WH-Mumbai-01 and WH-Pune-07 into a single mega-DC. Evaluate transport cost savings vs increased lead time to Chennai distributors.", "impact": "5 SKUs re-routed", "status": "draft", "createdAt": "2026-07-01T09:15:00Z"},
    {"id": "scn-010", "title": "Monsoon Seasonal Shift", "detail": "Adjust forecast for a delayed monsoon. Historical correlation shows 8-12% drop in out-of-home consumption during extended rainy periods.", "impact": "-6.3% snacks", "status": "active", "createdAt": "2026-06-15T07:30:00Z"},
    {"id": "scn-011", "title": "Private Label Competition", "detail": "Model the impact of a major retailer launching private-label instant coffee at 30% lower price point. Assume 5-8% market share erosion over 12 weeks.", "impact": "-7.2% coffee", "status": "draft", "createdAt": "2026-07-10T10:00:00Z"},
    {"id": "scn-012", "title": "Export Opportunity — Middle East", "detail": "Evaluate feasibility of exporting excess Maggi and Nescafé inventory to UAE and Saudi Arabia. Model incremental demand and logistics costs.", "impact": "+15% utilisation", "status": "draft", "createdAt": "2026-07-18T12:00:00Z"},
]

# ──────────────────────────────────────────────
# Data Sources (10 sources)
# ──────────────────────────────────────────────
DATA_SOURCES = [
    {"id": "ds-001", "name": "SAP ERP — Sales Orders", "status": "Connected", "freshness": "2 min ago", "type": "ERP", "lastSync": (_NOW - timedelta(minutes=2)).isoformat()},
    {"id": "ds-002", "name": "POS Retail Feed — All India", "status": "Syncing", "freshness": "12 sec ago", "type": "POS", "lastSync": _NOW.isoformat()},
    {"id": "ds-003", "name": "Supplier Collaboration Portal", "status": "Connected", "freshness": "18 min ago", "type": "Supplier", "lastSync": (_NOW - timedelta(minutes=18)).isoformat()},
    {"id": "ds-004", "name": "Warehouse WMS API", "status": "Connected", "freshness": "5 min ago", "type": "API", "lastSync": (_NOW - timedelta(minutes=5)).isoformat()},
    {"id": "ds-005", "name": "Manual Uploads — Distributor", "status": "Disconnected", "freshness": "2 days ago", "type": "Manual", "lastSync": (_NOW - timedelta(days=2)).isoformat()},
    {"id": "ds-006", "name": "E-Commerce — Amazon India", "status": "Connected", "freshness": "1 min ago", "type": "API", "lastSync": (_NOW - timedelta(minutes=1)).isoformat()},
    {"id": "ds-007", "name": "E-Commerce — Flipkart", "status": "Syncing", "freshness": "45 sec ago", "type": "API", "lastSync": _NOW.isoformat()},
    {"id": "ds-008", "name": "Weather Data — IMD Feed", "status": "Error", "freshness": "3 hours ago", "type": "API", "lastSync": (_NOW - timedelta(hours=3)).isoformat()},
    {"id": "ds-009", "name": "Promotional Calendar — Marketing", "status": "Connected", "freshness": "1 hour ago", "type": "Manual", "lastSync": (_NOW - timedelta(hours=1)).isoformat()},
    {"id": "ds-010", "name": "Transportation TMS", "status": "Connected", "freshness": "22 min ago", "type": "API", "lastSync": (_NOW - timedelta(minutes=22)).isoformat()},
]

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────
DEFAULT_CONFIG = {
    "granularity": "weekly",
    "forecastHorizon": 12,
    "historyWindow": 104,
    "aggregationHierarchy": "sku-location",
    "industryTemplate": "fmcg",
    "defaultLeadTime": 14,
    "shelfLifeDays": 90,
    "moq": 50,
    "serviceLevelTarget": 97.5,
    "holidays": ["2026-01-26", "2026-08-15", "2026-10-02", "2026-11-14", "2026-12-25"],
    "promoCalendarEnabled": True,
    "algorithmMode": "auto",
    "selectedAlgorithm": "lightgbm",
    "intermittentRouting": False,
    "outlierTreatment": "winsorize",
    "seasonalityMode": "auto",
    "externalRegressors": True,
    "backtestingWindow": 8,
    "retrainingFrequency": "weekly",
    "predictionIntervals": True,
    "hierarchicalReconciliation": "bottom-up",
    "accuracyMetric": "wape",
    "exceptionThreshold": 25,
    "reorderFormula": "dynamic",
    "notificationChannel": "email",
    "notificationEmail": "anika.patel@nestle-india.com",
}

# ──────────────────────────────────────────────
# Export Packages (8 packages)
# ──────────────────────────────────────────────
EXPORT_PACKAGES = [
    {"id": "exp-1", "name": "Forecast Snapshot — All SKUs", "format": "CSV", "status": "ready", "updatedAt": (_NOW - timedelta(minutes=18)).isoformat(), "size": "2.4 MB"},
    {"id": "exp-2", "name": "Replenishment Plan — Jul Wk 4", "format": "XLSX", "status": "ready", "updatedAt": (_NOW - timedelta(minutes=20)).isoformat(), "size": "1.8 MB"},
    {"id": "exp-3", "name": "Alert Payload — JSON Feed", "format": "JSON", "status": "ready", "updatedAt": (_NOW - timedelta(minutes=22)).isoformat(), "size": "0.6 MB"},
    {"id": "exp-4", "name": "Full Backtest Results — Q2 2026", "format": "CSV", "status": "generating", "updatedAt": _NOW.isoformat(), "size": "—"},
    {"id": "exp-5", "name": "Accuracy Report — Category Level", "format": "XLSX", "status": "ready", "updatedAt": (_NOW - timedelta(hours=2)).isoformat(), "size": "1.1 MB"},
    {"id": "exp-6", "name": "Safety Stock Recommendations", "format": "CSV", "status": "ready", "updatedAt": (_NOW - timedelta(hours=4)).isoformat(), "size": "0.8 MB"},
    {"id": "exp-7", "name": "Exception Log — Past 7 Days", "format": "CSV", "status": "ready", "updatedAt": (_NOW - timedelta(days=1)).isoformat(), "size": "0.3 MB"},
    {"id": "exp-8", "name": "Scenario Comparison — Diwali 2026", "format": "XLSX", "status": "failed", "updatedAt": (_NOW - timedelta(minutes=30)).isoformat(), "size": "—"},
]

INTEGRATIONS = [
    {"name": "SAP ERP", "status": "Connected", "icon": "ArrowRightLeft"},
    {"name": "Slack Alerts", "status": "Enabled", "icon": "Download"},
    {"name": "Power BI", "status": "Scheduled refresh", "icon": "RefreshCw"},
    {"name": "Webhook — Custom", "status": "Configured", "icon": "Clock"},
    {"name": "AWS S3 Data Lake", "status": "Connected", "icon": "Database"},
    {"name": "Google Sheets", "status": "Disconnected", "icon": "FileSpreadsheet"},
    {"name": "Tableau Server", "status": "Connected", "icon": "BarChart3"},
    {"name": "Zapier Automation", "status": "Enabled", "icon": "Zap"},
]

# ──────────────────────────────────────────────
# Model Analytics
# ──────────────────────────────────────────────
MODEL_METRICS = [
    {"label": "Forecast Accuracy (WAPE)", "value": "92.4%", "delta": "+1.8%", "trend": "positive"},
    {"label": "Bias Error", "value": "3.1%", "delta": "-0.4%", "trend": "positive"},
    {"label": "Service Level Coverage", "value": "97.2%", "delta": "+2.1%", "trend": "positive"},
    {"label": "Exception Rate", "value": "6.7%", "delta": "+0.3%", "trend": "negative"},
    {"label": "Avg. Backtest MAPE", "value": "14.8%", "delta": "-1.2%", "trend": "positive"},
    {"label": "Model Retrain Duration", "value": "4.2 min", "delta": "-0.8 min", "trend": "positive"},
]

MODEL_COMPARISON = [
    {"name": "LightGBM", "accuracy": 92.1, "bias": 2.8, "coverage": 97.0, "speed": "Fast"},
    {"name": "ETS", "accuracy": 87.4, "bias": 4.1, "coverage": 94.2, "speed": "Fast"},
    {"name": "SARIMA", "accuracy": 89.8, "bias": 3.2, "coverage": 95.6, "speed": "Moderate"},
    {"name": "Moving Avg", "accuracy": 81.2, "bias": 5.8, "coverage": 91.1, "speed": "Very Fast"},
    {"name": "Croston (Intermittent)", "accuracy": 78.6, "bias": 6.3, "coverage": 88.5, "speed": "Fast"},
    {"name": "Prophet (Meta)", "accuracy": 90.5, "bias": 3.0, "coverage": 96.3, "speed": "Moderate"},
]

# ──────────────────────────────────────────────
# Backtest Results (for the backtest endpoint)
# ──────────────────────────────────────────────
BACKTEST_RESULTS = {
    "lastRun": (_NOW - timedelta(hours=3)).isoformat(),
    "duration": "4 min 12 sec",
    "skuCount": len(SKUS),
    "locations": len(WAREHOUSES),
    "results": [
        {"model": "LightGBM", "mape": 12.8, "wape": 9.1, "bias": 1.2, "coverage": 97.0},
        {"model": "ETS", "mape": 15.4, "wape": 11.6, "bias": 3.8, "coverage": 94.2},
        {"model": "SARIMA", "mape": 14.1, "wape": 10.3, "bias": 2.4, "coverage": 95.6},
        {"model": "Moving Avg", "mape": 19.8, "wape": 15.2, "bias": 5.1, "coverage": 91.1},
        {"model": "Croston", "mape": 21.3, "wape": 16.8, "bias": 6.7, "coverage": 88.5},
    ],
}
