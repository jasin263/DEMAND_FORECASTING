# ForecastIQ — Demand Forecasting Platform

## 🧸 What Is This?

Imagine you run a company that sells food, toys, and cleaning supplies across 3 US states (California, Texas, Wisconsin). You have **117 different products** (SKUs) in your warehouse. Every week, you need to guess: *"How many boxes of cereal will we sell next month?"*

If you guess too **high** → you waste money on extra warehouse space.
If you guess too **low** → you run out of stock and lose customers.

**ForecastIQ** solves this by using real math (statistics + machine learning) to predict future sales. It's like having a smart calculator that learns from past sales data and tells you exactly how much to order, when to order it, and what might go wrong.

---

## 🗺️ Project Layout — A Map of the City

```
📁 DEMANDD/
├── 📁 dataset/                          # Raw M5 data from Walmart (the real sales records)
│   └── m5-forecasting-accuracy/
│       ├── calendar.csv                 # Dates, holidays, events — 1,941 days
│       ├── sales_train_validation.csv   # Daily sales for 30,490 products — huge file
│       └── sell_prices.csv              # Weekly prices for each product at each store
│
├── 📁 backend/                          # The "brain" — Python server
│   ├── main.py                          # Entry point — wires everything together
│   ├── models.py                        # Data shapes — like blueprints for information
│   ├── forecast_engine.py               # Traditional statistics (Holt-Winters, ARIMA, etc.)
│   ├── ml_forecast.py                   # Machine learning (Prophet + LightGBM)
│   ├── data/
│   │   ├── m5_loader.py                 # Reads the CSV files and turns them into numbers
│   │   ├── m5_data.py                   # Central "memory" — holds all computed data
│   │   └── mock_data.py                 # Old fake data (no longer used by routes)
│   └── routes/                          # Each file = one group of features
│       ├── kpi.py, forecast.py, skus.py
│       ├── exceptions.py, scenarios.py
│       ├── backtest.py, model_analytics.py
│       ├── hierarchy.py, promotions.py
│       ├── accuracy.py, configuration.py
│       ├── data_sources.py, export_packages.py
│       ├── onboarding.py
│       ├── backtesting.py               # NEW: Walk-forward validation
│       ├── seasonal_decomp.py           # NEW: Seasonality breakdown
│       ├── simulations.py               # NEW: What-if engine
│       ├── demand_sensing.py            # NEW: Multi-channel blending
│       ├── inventory.py                 # NEW: Safety stock & reorder points
│       ├── external_factors.py          # NEW: Weather & economic data
│       ├── collaboration.py             # NEW: Team annotations & approvals
│       └── consensus.py                 # NEW: Blended ML+Stat+Judgmental forecast
│
├── 📁 frontend/                         # The "face" — what you see in the browser
│   └── src/
│       ├── App.tsx                      # Main app with all page routes
│       ├── main.tsx                     # Startup file
│       ├── lib/
│       │   ├── api-client.ts            # How the frontend talks to the backend (fetch)
│       │   ├── api-hooks.ts             # Reusable React hooks for each API call
│       │   └── api-types.ts             # TypeScript shapes matching backend models
│       ├── components/                  # Reusable UI pieces
│       │   ├── AppLayout.tsx            # The wrapper around every page
│       │   ├── Sidebar.tsx              # Left navigation menu
│       │   ├── Topbar.tsx               # Top bar with refresh & backtest info
│       │   ├── ErrorBoundary.tsx        # Catches crashes
│       │   ├── KPIBentoGrid.tsx         # KPI cards on dashboard
│       │   ├── ForecastChartSection.tsx # Charts
│       │   └── ... (more components)
│       └── pages/                       # One file per page
│           ├── ForecastDashboardPage.tsx
│           ├── ExceptionsPage.tsx
│           ├── ScenariosPage.tsx
│           ├── BacktestingPage.tsx       # NEW
│           ├── SeasonalDecompPage.tsx    # NEW
│           ├── SimulationsPage.tsx       # NEW
│           ├── DemandSensingPage.tsx     # NEW
│           ├── InventoryPage.tsx         # NEW
│           ├── ExternalFactorsPage.tsx   # NEW
│           ├── CollaborationPage.tsx     # NEW
│           ├── ConsensusPage.tsx         # NEW
│           └── ...
│
```

---

## 📊 The Data — Where Do the Numbers Come From?

### The M5 Accuracy Dataset

Think of this dataset as **real Walmart sales data**. It's called "M5" because it was used in the 5th Makridakis forecasting competition — one of the most famous forecasting contests in the world.

**What's in it?**
- **30,490 products** sold across 3 states (CA, TX, WI) and 10 stores
- **1,941 days** of daily sales (from 2011 to 2016)
- **Prices** — what each product was sold for each week
- **Events** — holidays, promotions, special days

**What we did with it:**
- Picked **117 products** (39 Foods, 39 Hobbies, 39 Household) so we have a balanced sample
- Converted daily sales to **weekly sales** (easier to forecast)
- Cached the data in **parquet format** so it loads in seconds, not minutes

### How Data Flows Through the System

```
M5 CSVs (on disk)
    │
    ▼
m5_loader.py ─── reads CSV, samples 117 SKUs, aggregates to weekly
    │
    ▼
m5_data.py ─── stores everything in memory (like a big filing cabinet)
    │
    ▼
forecast_engine.py ─── runs statistics (Holt-Winters, ARIMA, Naive)
ml_forecast.py ─── runs ML (Facebook Prophet, LightGBM)
    │
    ▼
Routes (exceptions.py, backtesting.py, etc.) ─── serve data via HTTP
    │
    ▼
Frontend (React + TypeScript) ─── shows charts, tables, forms
```

Every time the backend starts up, it:
1. Loads the M5 data from parquet cache (fast — ~2 seconds)
2. Runs ML forecasts for all 117 SKUs (~30 seconds)
3. Computes KPIs, backtest results, model comparisons
4. Generates exceptions and accuracy history snapshots
5. Gets ready to serve requests on port 8000

---

## ⚙️ The Engine Room — Forecasting Methods

### 1. Traditional Statistics (`forecast_engine.py`)

Like the old reliable calculator. These methods have been used for 50+ years.

| Method | What it does | Best for |
|--------|-------------|----------|
| **Naive** | "Tomorrow will be the same as today" | Baseline — just to compare against |
| **Holt-Winters (ETS)** | Finds trend + seasonality patterns | Smooth, regular products |
| **Seasonal Holt-Winters** | Same, but looks at yearly patterns | Seasonal products (ice cream, decorations) |
| **ARIMA** | Smart pattern-matching on past data | Most everyday products |
| **Croston** | Handles products that sell sporadically | Slow-moving or intermittent items |

### 2. Machine Learning (`ml_forecast.py`)

Like giving the calculator a PhD. These learn complex patterns.

| Method | What it does | Why it's powerful |
|--------|-------------|-------------------|
| **Prophet** (primary) | Facebook's forecasting tool — handles holidays, changepoints, seasonality | Handles missing data, outliers, and holidays automatically |
| **LightGBM** (fallback) | Microsoft's gradient boosting — uses 20+ engineered features | Can capture complex interactions between price, events, and demand |

**Feature engineering** — before feeding data to ML, we build smart features:
- **Lags**: last week's sales, 2 weeks ago, 4 weeks, 8 weeks, 12 weeks, 24 weeks
- **Rolling stats**: average, std dev, max over 4/8/12 week windows
- **Year-over-year change**: how does this week compare to the same week last year?
- **Seasonality**: sin/cos waves at periods of 13, 26, and 52 weeks
- **Price features**: current price, price change %, lagged price
- **Event features**: is there a holiday this week? how many events?

**Fallback chain**: If Prophet fails → try LightGBM → try Holt-Winters → try Naive. The system always produces *some* forecast, never crashes.

### 3. Auto Pattern Detection

Before forecasting, the system figures out what kind of product this is:

```
series = [100, 95, 105, 98, 102, ...]
    │
    ▼
detect_demand_pattern(series)
    │
    ├── >25% zeros? → "Intermittent" (sporadic, use Croston)
    ├── std/mean > 1.2? → "Erratic" (unpredictable, use ETS)
    ├── correlation with 52-week-ago > 0.35? → "Seasonal" (use SARIMA)
    └── otherwise → "Smooth" (use ETS)
```

This means every SKU gets the *right* forecasting method automatically.

---

## 🧩 The 15 Features — Explained Simply

### Phase 1: Setup & Connect (one-time)

#### 1. Onboarding Wizard (`/onboarding-wizard`)
When you first start, you go through a 4-step wizard:
1. Create your workspace ("Nestle FMCG Demo")
2. Upload your data file (CSV/Excel)
3. Map columns (which column is "date", which is "sales")
4. Confirm settings

Then the system fires up and runs the first forecast.

#### 2. Configuration (`/configuration-panel`)
All the knobs and dials you can tweak:
- **Granularity**: daily, weekly, or monthly forecasts
- **Forecast horizon**: how far ahead to predict (default 12 weeks)
- **Algorithm**: auto, Prophet, or LightGBM
- **Seasonality**: auto, weekly, monthly, yearly, or none
- **Outlier handling**: winsorize, remove, or ignore
- **Service level target**: what fill rate to aim for (default 97.5%)
- **Exception threshold**: how bad does MAPE need to be before we flag it?

#### 3. Data Sources (`/data-sources`)
A list of all connected data sources — ERP, POS, supplier feeds, manual uploads.
- Add new sources (name + type)
- Refresh a source (triggers re-sync)
- Delete sources
- Shows status (Connected, Syncing, Error, Disconnected) and freshness

---

### Phase 2: Monitor, Plan & Forecast (daily loop)

#### 4. Forecast Dashboard (`/`)
The main screen. Shows:
- **KPI cards**: Forecast Accuracy (WAPE), Bias Error, Service Level, Exception Rate, Avg Backtest MAPE, Model Retrain Duration
- **Forecast chart**: actual sales vs predicted sales with uncertainty bands (P10/P50/P90)
- **Accuracy by category**: bar chart for Foods, Hobbies, Household
- **SKU table**: all 117 products with their forecast info — sort, filter, search, paginate
- **Drill down**: click any SKU to see its full detail page

The chart shows "the cone of uncertainty" — the P10-P90 band shows the range where actual sales are likely to fall.

#### 5. Exceptions & Alerts (`/exceptions`)
When a forecast goes wrong, the system raises a flag. Three types:
- **High MAPE** — our forecast was way off (>25% error)
- **Stockout Risk** — inventory will run out in <14 days
- **Demand Spike** — sudden jump in sales (>1.8x normal)

You can:
- **Resolve** — "I've handled this, mark it done"
- **Acknowledge** — "I see this, will deal with it"
- **Dismiss** — "This is fine, ignore it"
- Add notes to document your decision
- Bulk-select and action multiple exceptions at once
- Export exceptions to CSV

#### 6. Model Analytics (`/model-analytics`)
How well are our forecasting models performing?
- **Model comparison table**: Naive vs SES vs ARIMA — accuracy, bias, coverage, speed
- **Accuracy drift monitoring**: WAPE and MAPE trend over the last 12 runs
- **Drift status**: "stable" (all good), "degrading" (getting worse), or "improving" (getting better)
- **Backtest results**: real MAPE/WAPE/bias from rolling validation
- **Run backtest button**: triggers a fresh backtest on demand

#### 7. What-If Scenarios (`/scenarios`)
Pre-built scenario templates:
- **"Diwali Surge"**: sales +5,000 units for the holiday season
- **"Supplier Disruption"**: 30% supply cut for 4 weeks
- **"Promo Impact"**: 20% uplift from a promotion campaign

Each scenario has a title, detail, impact metric, and status (draft/active/archived). Full CRUD — create, edit, delete.

#### 8. Simulation Engine (`/simulations`)
Like scenarios but *live* — you set parameters and the system actually re-runs forecasts to show you the impact.

**Presets:**
- **20% Promo Lift**: +20% demand, -10% price
- **15% Price Cut**: -15% price, +8% demand
- **Supply Disruption**: -30% demand (supply shortage)
- **Aggressive Growth**: +50% promo, +30% demand

**Available parameters:**
- promo_lift_pct (-50% to +200%)
- price_change_pct (-50% to +100%)
- demand_shift_pct (-80% to +300%)
- service_level_target (80% to 99.9%)
- lead_time_days (7, 14, 21, 30, 45, 60)

The simulation actually runs real forecasts with adjusted parameters and shows you before/after charts.

#### 9. Consensus Forecast (`/consensus`)
No single forecasting method is perfect. So we blend **three**:

| Source | Weight | What it is |
|--------|--------|------------|
| **ML Forecast** (Prophet) | 50% | Machine learning with all features |
| **Statistical** (Holt-Winters) | 30% | Traditional time series |
| **Judgmental** (planner input) | 20% | Human expertise adjustment |

**Adaptive weighting**: The system tracks which method was most accurate recently and adjusts weights automatically. If ML has been nailing it, its weight goes up. If statistical has been better, that gets boosted.

The blended result almost always beats any single method — that's the magic of ensemble forecasting.

---

### Phase 3: Deep Analytics & Optimization (periodic deep-dives)

#### 10. Walk-Forward Backtesting (`/backtesting`)
This is how you *really* test if a forecasting method works.

**The idea**: Instead of testing once, you test many times by sliding a window forward.

```
Window 1: train [weeks 1-100] → forecast [weeks 101-108] → measure error
Window 2: train [weeks 1-108] → forecast [weeks 109-116] → measure error
Window 3: train [weeks 1-116] → forecast [weeks 117-124] → measure error
...
```

For each SKU, you get:
- **Per-fold results**: MAPE, WAPE, bias, coverage for each window
- **Averages**: how the model performs on average
- **Stability score**: how consistent the performance is (low variance = high stability)

Shows bar charts and a detailed table so you can spot which SKUs are hard to forecast.

#### 11. Seasonality Decomposition (`/seasonal-decomposition`)
Breaks each SKU's sales into three hidden components:

```
SALES = TREND + SEASONAL + RESIDUAL

Example: Ice cream sales
- Trend: slowly rising (people buy more ice cream every year)
- Seasonal: big summer peaks, winter valleys
- Residual: random noise (a heat wave caused an extra spike)
```

For each SKU you get:
- **Seasonal strength** (0 to 1): how strong the seasonal pattern is
- **Dominant period**: detected cycle length in weeks
- **Trend direction**: up, down, or flat
- **Component charts**: actual vs trend overlay + seasonal pattern + residuals

#### 12. Demand Sensing (`/demand-sensing`)
In a real company, you get signals from multiple channels:
- **POS**: what was scanned at the cash register
- **Sell-In**: what retailers ordered from you
- **Sell-Out**: what retailers sold to consumers
- **Store Stock**: what's currently on shelves
- **Warehouse Stock**: what's in your distribution center

Each signal is noisy on its own. By blending them together with weighted averaging + smoothing, we get a cleaner picture of *true* demand.

*Note: Since M5 data only has sell-through (aggregate sales), the individual channels are simulated from the real data — the blending math is real.*

#### 13. External Factors (`/external-factors`)
Sales don't happen in a vacuum. These external forces affect demand:

| Factor | Type | What it measures |
|--------|------|-----------------|
| Temperature | 🌤️ Weather | Weekly average temperature |
| Precipitation | 🌤️ Weather | Weekly total rainfall |
| GDP Index | 📊 Economic | Economic growth indicator |
| CPI | 📊 Economic | Consumer price inflation |
| Competitor Promo Intensity | 🏪 Competitive | How much competitors are discounting |
| Competitor Ad Spend | 🏪 Competitive | How much competitors are advertising |
| Holiday/Event Flag | 📅 Calendar | Is there a major holiday this week? |
| Monthly Seasonality | 📅 Calendar | Expected seasonal multiplier |

Each factor can be toggled on/off. The system shows correlation values (r) between each factor and each SKU, plus detected lag (how many weeks before the factor affects sales).

*Note: M5 has no real external data, so factors are generated as realistic synthetic series. The correlation infrastructure is production-ready.*

#### 14. Inventory Optimization (`/inventory`)
Given a forecast, how much should you actually *order*? This feature computes:

| Metric | What it means | Formula |
|--------|--------------|---------|
| **Safety Stock** | Extra inventory for uncertainty | Z(service level) × √(lead time × demand variance) |
| **Reorder Point** | When to place next order | Avg daily demand × lead time + safety stock |
| **EOQ** | Optimal order quantity | √(2 × annual demand × order cost / holding cost) |
| **Target Stock** | Ideal max inventory | Reorder point + EOQ/2 |
| **Projected Fill Rate** | % of demand you'll meet | ~98% at 97.5% service level |
| **Stockout Probability** | Chance of running out | (1 - service level) × 100 |

You can adjust:
- **Service level target** (80% to 99.9%) via slider
- **Lead time** (1 to 90 days) via slider

All results update in real-time as you slide.

---

### Phase 4: Collaborate & Export

#### 15. Collaboration — Annotations & Overrides (`/collaboration`)
Forecasting is a team sport. This lets planners work together:

**Annotations** — comments on specific SKUs and weeks:
- "Promo planned for week 24 — expect 20% lift"
- "Historical data looks wrong for this SKU"
- "Weather alert next week — adjust forecast down"

**Overrides** — when a planner knows better than the algorithm:
- Original P50: 1,200 units
- Adjusted P50: 1,500 units (planner knows about a big promotion)
- Includes reason, original values, and adjusted values
- Goes through an **approval workflow**: pending → approved/rejected

**Threaded Discussions** — full conversation threads about forecasts:
- Start a thread on any SKU
- Add messages in reply
- Resolve when conversation is done

**Pending approvals badge** shows how many overrides need review.

---

## 🔌 How Frontend & Backend Talk to Each Other

### The API (HTTP with JSON)

Frontend (React) talks to Backend (Python) using HTTP requests:

```
Frontend (port 4028) ───GET /api/tenants/nestle-fmcg-demo/kpi-summary───▶ Backend (port 8000)
Frontend (port 4028) ◀─────────── JSON response ───────────────────── Backend (port 8000)
```

All requests go through `api-client.ts` which:
1. Prepends the base URL: `/api/tenants/nestle-fmcg-demo/`
2. Has retry logic (2 retries on failure)
3. Has timeout (15 seconds per request)
4. Handles GET, POST, PUT, PATCH, DELETE

### React Hooks Pattern

Each API endpoint has a corresponding React hook:
```typescript
// In api-hooks.ts:
export function useKPISummary() {
  return useApi(() => apiGet<KPISummary>('/kpi-summary'));
}

// In DashboardHeader.tsx:
const { data: kpi, loading } = useKPISummary();
```

The `useApi<T>()` hook handles loading state, error state, and refetching automatically.

### TypeScript Types ↔ Pydantic Models

The same data shapes exist in both frontend and backend:

| Frontend (`api-types.ts`) | Backend (`models.py`) |
|--------------------------|----------------------|
| `interface KPISummary` | `class KPISummary(BaseModel)` |
| `interface ExceptionItem` | `class ExceptionItem(BaseModel)` |
| `interface WalkForwardReport` | `class WalkForwardReport(BaseModel)` |
| ... | ... |

This means if a backend API returns 10 fields, the frontend expects exactly those 10 fields. TypeScript catches mismatches at build time.

---

## 🧪 How Forecasting Actually Works Step-by-Step

### What happens when you visit the Dashboard

1. Frontend calls `GET /kpi-summary`, `GET /forecast-timeseries`, `GET /accuracy-by-category`, `GET /backtest-results`
2. Backend returns data from `m5_data.py` module-level variables (pre-computed on startup)
3. Frontend renders:
   - KPI cards (WAPE, bias, service level, etc.)
   - Forecast chart (actual + predicted over time)
   - Accuracy bar chart (by category)
   - SKU table

### What happens when you click "Run Backtest"

1. Frontend calls `POST /backtest/run`
2. Backend calls `_precompute_forecasts()` which:
   - Takes all 117 SKU sales series
   - For each: splits into train/test, runs Prophet forecast, measures MAPE/WAPE/bias
   - Computes overall KPIs by comparing against Naive baseline
   - Updates accuracy history for drift monitoring
3. Returns fresh timeseries data

### What happens when you run a Simulation

1. Frontend sends parameters (e.g., promo_lift_pct: 20, price_change_pct: -10)
2. Backend:
   - Gets SKU sales data
   - Runs baseline forecast (without adjustments)
   - Adjusts parameters (adds 20% lift, subtracts 10% price)
   - Runs simulation forecast on adjusted data
   - Computes impact: `(simulated - baseline) / baseline × 100`
3. Returns per-week series showing baseline vs simulated

---

## 🚀 How to Run Everything

### Backend (Python server)
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# Wait ~30 seconds for M5 data to load
# Server ready at http://localhost:8000
```

### Frontend (Vite)
```bash
cd frontend
npm install
npm run dev    # starts on port 4028
```

### Verify it works
```bash
# Backend health check
curl http://localhost:8000/api/health

# Should return: {"status":"healthy","service":"forecastiq-backend","version":"1.0.0"}
```

---

## 📈 API Endpoint Reference

All endpoints are available under `/api/tenants/nestle-fmcg-demo/`.

### Core Dashboard
| Endpoint | Method | What it returns |
|----------|--------|----------------|
| `/kpi-summary` | GET | WAPE, MAPE, bias, service level, exception count |
| `/forecast-timeseries` | GET | Weekly actual + P50/P10/P90 forecast values |
| `/forecast-timeseries/rerun` | POST | Re-compute all forecasts, return fresh data |
| `/accuracy-by-category` | GET | MAPE per category (Foods, Hobbies, Household) |
| `/locations` | GET | List of all store locations |

### SKU Management
| Endpoint | Method | What it returns |
|----------|--------|----------------|
| `/skus` | GET | Paginated SKU list with search, sort, filter |
| `/skus/{sku_id}` | GET | Full SKU detail with backtest history & forecast |

### Exceptions
| Endpoint | Method | What it returns |
|----------|--------|----------------|
| `/exceptions` | GET | All exception items (filterable by severity/status) |
| `/exceptions/{exc_id}` | PATCH | Resolve/acknowledge/dismiss with optional note |
| `/exceptions/export` | POST | Export exceptions as CSV |

### Models & Analytics
| Endpoint | Method | What it returns |
|----------|--------|----------------|
| `/model-analytics` | GET | Model metrics comparison + accuracy history |
| `/accuracy-drift` | GET | WAPE/MAPE trend, drift deltas, degradation status |
| `/backtest-results` | GET | Backtest summary (last run, duration, per-model results) |
| `/backtest/run` | POST | Trigger fresh backtest |

### Hierarchy & Promotions
| Endpoint | Method | What it returns |
|----------|--------|----------------|
| `/hierarchy` | GET | Bottom-up reconciled forecasts (117 SKUs + 3 categories) |
| `/promotion-impact` | GET | All SKU promotion impact analysis |
| `/promotion-impact/{sku_id}` | GET | Single SKU promo lift, elasticity, sweet-spot price |

### Scenarios & Simulations
| Endpoint | Method | What it returns |
|----------|--------|----------------|
| `/scenarios` | GET/POST | List or create scenario |
| `/scenarios/{scenario_id}` | GET/PUT/DELETE | Read/update/delete scenario |
| `/simulations` | GET/POST | List simulations or create new |
| `/simulations/{sim_id}` | GET/DELETE | Read/delete simulation |

### Data Sources & Config
| Endpoint | Method | What it returns |
|----------|--------|----------------|
| `/data-sources` | GET/POST | List or create data source |
| `/data-sources/{id}` | DELETE | Remove data source |
| `/data-sources/{id}/refresh` | POST | Trigger sync |
| `/configuration` | GET/PUT | Read or update app configuration |
| `/onboarding` | POST | Create workspace, run initial setup |

### NEW — Advanced Features
| Endpoint | Method | What it returns |
|----------|--------|----------------|
| `/backtesting/walk-forward` | GET | Walk-forward validation with folds |
| `/seasonal-decomposition` | GET | Trend/seasonal/residual per SKU |
| `/demand-sensing` | GET | Multi-channel signal blending |
| `/demand-sensing/config` | POST | Update sensing weights |
| `/inventory/optimization` | GET | Safety stock, reorder point, EOQ |
| `/external-factors` | GET | Weather/macro/competitive factors |
| `/external-factors/{id}/toggle` | POST | Enable/disable a factor |
| `/collaboration` | GET | All annotations, overrides, threads |
| `/collaboration/annotations` | POST | Add annotation |
| `/collaboration/overrides` | POST | Submit override proposal |
| `/collaboration/overrides/{id}/approve` | POST | Approve/reject override |
| `/collaboration/threads` | POST | Start discussion thread |
| `/collaboration/threads/{id}/messages` | POST | Reply to thread |
| `/collaboration/threads/{id}/resolve` | POST | Close thread |
| `/consensus` | GET | ML+statistical+judgmental blended forecast |
| `/consensus/config` | POST | Update consensus weights |

### Export
| Endpoint | Method | What it returns |
|----------|--------|----------------|
| `/export-packages` | GET/POST | List or create export package |
| `/export-packages/{id}/download` | GET | Download generated package |

---

## 📦 Tech Stack Summary

| Layer | Technology | What it does |
|-------|-----------|--------------|
| **Backend** | Python 3.13 + FastAPI | Serves API on port 8000 |
| **Forecasting** | Prophet, LightGBM, statsmodels | Real ML + statistical forecasting |
| **Data** | Pandas, NumPy, PyArrow | Data processing and parquet caching |
| **Frontend** | React 19 + Vite + TypeScript | UI on port 4028 |
| **Charts** | Recharts | Interactive charts and graphs |
| **Styling** | Tailwind CSS | Dark-themed UI |
| **Icons** | Lucide React | SVG icons |
| **Validation** | Pydantic (backend) + TypeScript (frontend) | Type safety everywhere |

---

## ✅ What's Real vs What's Simulated

### 100% Real — Powered by Actual Data + Computation
- All M5 sales data (117 SKUs, 274 weeks, real Walmart numbers)
- Prophet and LightGBM forecasts with feature engineering
- Holt-Winters, ARIMA, Naive, Croston statistical methods
- Walk-forward backtesting with real folds
- Seasonality decomposition via statsmodels
- Inventory formulas (EOQ, safety stock, reorder point)
- Exception workflow (PATCH resolve/acknowledge/dismiss)
- Accuracy drift monitoring (real WAPE/MAPE tracking)
- Hierarchical reconciliation (bottom-up SKU → Category)
- Consensus blended forecast with adaptive weighting

### Semi-Real — Real Math with Synthetic Inputs
- **Demand Sensing**: channel signals (POS/sell-in/sell-out) are simulated from aggregate sales — the blending/smoothing math is real
- **External Factors**: weather, economic, and competitive factors are synthetic — the correlation engine is real

### Demo Only — Not Connected to Live Systems
- Data Sources page shows a management UI but doesn't connect to real SAP/POS APIs
- Export packages generate files from in-memory data (no real Power BI/Slack integration)

---

## 🧰 Files to Know (Cheat Sheet)

| File | Lines | What it does |
|------|-------|-------------|
| `backend/main.py` | 77 | App entry — registers all 21 routers |
| `backend/models.py` | 450+ | All Pydantic data models |
| `backend/forecast_engine.py` | 297 | Statistical forecasting + backtesting |
| `backend/ml_forecast.py` | 274 | Prophet + LightGBM with feature engineering |
| `backend/data/m5_loader.py` | 359 | Reads M5 CSV → weekly data → structured dict |
| `backend/data/m5_data.py` | 419 | Central data store, lazy init, pre-computation |
| `frontend/src/App.tsx` | 54 | Route definitions for all 18 pages |
| `frontend/src/lib/api-types.ts` | 500+ | All TypeScript interfaces |
| `frontend/src/lib/api-hooks.ts` | 500+ | All React hooks for API calls |
| `frontend/src/components/Sidebar.tsx` | 176 | Navigation — 8 groups, 20 items |
