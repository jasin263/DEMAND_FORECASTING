# ForecastIQ — Comprehensive Demand Forecasting Demo Script

## Overview

**ForecastIQ** is a demand forecasting platform built for a **Nestlé India FMCG tenant**. It forecasts demand across **117 SKUs** in **9 categories** (Beverages, Dairy, Snacks, Frozen, Personal Care, Condiments, Rice & Grains, Oils & Ghee, Cleaning & Household), distributed across **12 warehouses** (Mumbai, Delhi, Bangalore, Chennai, Kolkata, Hyderabad, Pune, Ahmedabad, Jaipur, Lucknow, Chandigarh, Bhopal).

The platform uses 5 forecasting algorithms: **LightGBM**, **ETS (Exponential Smoothing)**, **SARIMA**, **Moving Average**, and **Croston (for intermittent demand)**. A 6th model, **Prophet (Meta)**, is also benchmarked.

The forecast engine generates **52-week timeseries** with trend, seasonality, and prediction intervals (P10/P90), computed statistically using exponential smoothing and moving averages.

The backend serves data via a **FastAPI** server with routes for KPI summaries, forecast timeseries, accuracy by category, exceptions, scenarios, data sources, configuration, export packages, model analytics, backtest results, SKU management, and onboarding.

---

## 1. Forecast Dashboard (`/`)

**Route:** `ForecastDashboardPage.tsx` → composed of 4 main components

### 1.1 DashboardHeader

**File:** `components/DashboardHeader.tsx`

**Features:**
- **Live status badge** — "Live · Updated 8 min ago" with green dot
- **SKU count badge** — dynamically fetched from `useSkus({ pageSize: 1 })` showing total SKU count (117)
- **Title** — "Forecast Dashboard"
- **Subtitle** — Shows current config: "Forecast horizon: 12 weeks · Granularity: Weekly · Model: Auto-select (ETS/LightGBM)"
- **Date range** — "Jul 1 – Jul 23, 2026" (current forecast window)
- **Category filter dropdown** — "All Categories", Beverages, Dairy, Snacks, Personal Care (for filtering the view)
- **Location filter dropdown** — "All Locations", WH-Mumbai-01, WH-Delhi-02, WH-Bangalore-03, WH-Chennai-04
- **Re-run button** — Navigates to the Onboarding Wizard to trigger a new forecast run

**What to say:**
> "This header tells you the current state at a glance. We're forecasting 117 SKUs across 12 locations, weekly granularity, using auto-selected models. The date range is the current 12-week forecast window. The category and location dropdowns let you slice the data — you can filter the dashboard to show only Beverages in Mumbai, for example."

---

### 1.2 KPIBentoGrid

**File:** `components/KPIBentoGrid.tsx`  
**Data:** Fetched from `useKPISummary()` which calls `GET /kpi-summary`

The backend computes these from the 52-week timeseries using `compute_kpi_metrics()` in `forecast_engine.py`.

**6 KPI Cards:**

#### Card 1: Overall WAPE (Hero card — 2x width)
```
Value: 11.4%  |  Delta: -1.2pp vs last run  |  Trend: Improving
Progress bar: 72% filled  |  Status: "Good"
Target: <15%  |  Current run: Jul 23, 2026
```
**What to say:**
> "WAPE — Weighted Absolute Percentage Error — is our primary accuracy metric. At 11.4%, we're well below the 15% target. It improved 1.2 percentage points from the last run, which means our model retraining is working. The progress bar shows where we stand relative to the acceptable range."

#### Card 2: Avg. MAPE
```
Value: 14.7%  |  Delta: +0.8pp vs last run  |  Trend: Worsening
```
**What to say:**
> "MAPE — Mean Absolute Percentage Error — is the simple average of per-SKU errors. At 14.7% it's reasonable, but the +0.8pp increase is concerning. Unlike WAPE which weights by volume, MAPE treats every SKU equally, so this tells us that *small-volume* SKUs may be degrading."

#### Card 3: P50 Forecast (12-week)
```
Value: 2.85M  |  Delta: +4.1% vs prior period  |  Trend: Growing
```
**What to say:**
> "This is the median forecast demand across all SKUs for the next 12 weeks — approximately 2.85 million units. The 4.1% growth vs the prior period suggests we're entering a higher-demand season, likely driven by the upcoming festive period."

#### Card 4: Exception SKUs (Warning style — yellow border)
```
Value: 23  |  Delta: +5 new this run  |  Threshold: MAPE > 25%
```
**What to say:**
> "23 SKUs have a MAPE above 25%, our exception threshold. This count increased by 5 in the latest run — these are the SKUs that need immediate attention. Each one is triaged on the Exceptions page."

#### Card 5: Forecast Bias
```
Value: -3.2%  |  Label: "Over-forecasting"  |  Note: "Positive = stock surplus"
```
**What to say:**
> "At -3.2%, we're over-forecasting — predicting more demand than actual. This means potential excess inventory. A +3.2% would mean under-forecasting, which risks stockouts. The ideal is as close to 0% as possible."

#### Card 6: Service Level
```
Value: 96.8%  |  Delta: +0.4pp vs last week  |  Target: 97.5%
```
**What to say:**
> "Service level measures the percentage of time forecast >= actual demand. We're at 96.8%, nearing the 97.5% target. This is a proxy for in-stock probability — at 97.5%, we'd have stock 97.5% of the time."

**Loading state:** Shows 6 animated skeleton cards
**Error state:** Red error card with message

---

### 1.3 ForecastChartSection

**File:** `components/ForecastChartSection.tsx`

**Features:**
- **Tab switcher** at top — "Forecast" and "Accuracy by Category"
- **Legend** — shows 3 items when Forecast tab is active:
  - Solid green line = "Actual Demand"
  - Dashed blue line = "P50 Forecast"  
  - Shaded band = "P10–P90 Band"
- **Lazy-loaded charts** via `React.lazy()` + `Suspense`
- **Skeleton fallback** while chart loads

**What to say:**
> "This section gives you two views of forecast performance. The default Forecast view shows a 16-week time-series chart. The Accuracy view breaks down forecast quality by category. Both charts are lazily loaded for performance."

#### 1.3a ForecastAreaChart (Forecast tab)

**File:** `components/ForecastAreaChart.tsx`  
**Data:** `useForecastTimeseries({ weeks: 16 })` → `GET /forecast-timeseries?weeks=16`

The backend returns 16 weekly data points from the 52-week timeseries in `mock_data.py`, each with: `week`, `actual`, `p50`, `p10`, `p90`.

**Chart details:**
- **Recharts AreaChart** with 3 overlapping layers:
  - P90 area (transparent gradient band — upper bound)
  - P10 area (background color — masks the lower part, creating a visible band between P10 and P90)
  - Actual line (solid, green-ish stroke, gradient fill, dots disabled)
  - P50 forecast line (dashed, blue-ish stroke, gradient fill)
- **Axis labels:** X = week labels (e.g., "Apr 28", "May 5"), Y = formatted as "48K", "52K", etc.
- **Reference line** — vertical dashed line at the first week where `actual` is `null` (forecast begins), labeled "Forecast →"
- **Custom tooltip** — shows Actual, P50, and P10-P90 range on hover
- **Grid:** Horizontal dashed lines only, no vertical grid lines
- **Loading state:** Centered spinner with "Loading chart..."
- **Error state:** Centered text "Failed to load forecast data"

**What to say:**
> "This is the core forecast visualization. The solid line is actual demand, the dashed line is our P50 forecast, and the shaded band represents the P10 to P90 prediction interval — we expect actual demand to fall within this band 80% of the time. Wider bands mean more uncertainty.

> Notice the vertical reference line — to the left, both actuals and forecasts are shown. To the right, actuals drop off and only the forecast remains. The last 4 weeks are pure prediction. You can hover over any week to see the exact numbers.

> The 52-week timeseries is generated with realistic trend (+0.5% per week), seasonality (12-week cycle), and Gaussian noise — mimicking a real FMCG demand pattern."

#### 1.3b AccuracyBarChart (Accuracy tab)

**File:** `components/AccuracyBarChart.tsx`  
**Data:** `useAccuracyByCategory()` → `GET /accuracy-by-category`

The backend returns 9 categories with MAPE values. The chart transforms MAPE to accuracy: `accuracy = 100 - mape`.

**Chart details:**
- **Recharts BarChart** with 6 colored bars
- **Bar colors:** primary, accent, positive, warning, info, negative (cycling)
- **Y-axis domain:** 0% to 100%
- **Custom tooltip** — shows category name and accuracy percentage
- **Loading state:** Centered spinner with "Loading accuracy..."
- **Error state:** Centered text "Failed to load accuracy data"

**What to say:**
> "This bar chart converts each category's MAPE into an accuracy score by subtracting from 100%. A higher bar means better forecast accuracy. The colors cycle through the palette to distinguish categories. The live data from the backend returns 9 categories — we see accuracy ranging from roughly 60% to 92%.

> Notice that categories with smooth, predictable demand patterns (like Rice & Grains) typically have higher accuracy, while categories with promotional activity or seasonality (like Snacks and Personal Care) tend to have lower accuracy. The tooltip shows the exact percentage."

---

### 1.4 ExceptionPanel (Sidebar)

**File:** `components/ExceptionPanel.tsx`  
**Data:** `useExceptions({ limit: 7 })` → `GET /exceptions?limit=7`

Shows the 7 most recent exceptions.

**Features:**
- **Header** — "Exceptions" with live count badge
- **"View all" link** — navigates to `/exceptions`
- **Exception list** — each item shows:
  - Type-specific icon: `AlertTriangle` (negative/red) for High MAPE, `PackageX` (warning/yellow) for Stockout Risk, `Zap` (accent/blue) for Demand Spike
  - **Product name** (truncated)
  - **SKU ID** (monospace font, e.g., "NES-BEV-0421")
  - **Type badge** — colored: "High MAPE" (red), "Stockout Risk" (yellow), "Demand Spike" (blue)
  - **Conditional numeric data**:
    - High MAPE → shows exact MAPE % (e.g., "38.2%")
    - Stockout Risk → shows days left (e.g., "3d left")
    - Demand Spike → shows multiplier (e.g., "2.4× avg")
- **Footer button** — "View All Exceptions" (secondary button, navigates to the full Exceptions page)
- **Loading state:** Centered spinner
- **Empty state:** "No active exceptions" message

**What to say:**
> "The exception sidebar is the demand planner's daily triage queue. It shows the most critical forecast quality issues — SKUs with high forecast error, imminent stockout risks, and sudden demand spikes. Each entry shows the product name, SKU ID, exception type, and severity data. The count badge at the top tells you how many active exceptions exist. Clicking 'View all' takes you to the full exception management workflow."

---

### 1.5 SKUDrilldownTable

**File:** `components/SKUDrilldownTable.tsx`  
**Data:** `useSkus({ pageSize: 100 })` → `GET /skus?pageSize=100`

Fetches all 117 SKUs in one page for local search/sort. The backend supports pagination, search, sorting, and category/pattern filtering.

**Features:**

#### Toolbar:
- **Title** — "SKU Forecast Detail"
- **Subtitle** — shows filtered count and sort info (e.g., "89 SKUs · sorted by mape desc")
- **Search input** — with search icon, filters by SKU name, SKU ID, or category (local filtering for POC)
- **Export button** — secondary action button (simulated)

#### Table columns (12 columns):
| Column | Type | Sortable | Description |
|--------|------|----------|-------------|
| SKU ID | Text (mono) | No | Internal ID like `NES-BEV-0421` |
| Name | Text | Yes | Product name (truncated to 180px) |
| Category | Text | Yes | Product category |
| Location | Text (mono) | No | Warehouse code |
| MAPE | Number (color-coded) | Yes | Red > 25, Yellow > 15, Green ≤ 15 |
| Bias | Number (color-coded) | Yes | Red if abs > 5, Yellow if abs > 2 |
| P50 Forecast | Number | Yes | Formatted with locale separators |
| Reorder Qty | Number | Yes | Recommended reorder quantity |
| Model | Badge | No | Algorithm name (mono, small font) |
| Pattern | Colored Badge | No | Smooth (green), Intermittent (yellow), Lumpy/Erratic (red), Seasonal (blue) |
| Trend | SVG sparkline | No | Mini polyline chart showing demand trend over 4-8 weeks |
| Actions | Eye icon | No | Opens SKU detail modal |

**Sorting:** Click any sortable column header to toggle asc/desc. Active sort column shows arrow icon (up for asc, down for desc).

**Pagination:**
- 8 items per page
- Previous/Next buttons (disabled at boundaries)
- Numbered page buttons (highlighted active page)
- "Showing X-Y of Z SKUs" info text

**Loading state:** Full-screen centered spinner
**Error state:** AlertTriangle icon + message + "Retry" button
**Empty search state:** PackageSearch icon + "No SKUs match your search" + helper text

**What to say:**
> "This is the most feature-rich component on the dashboard. It's a fully interactive table of all 117 SKUs with sorting, searching, pagination, trend sparklines, and color-coded metrics. The MAPE column is color-coded red/warning/green so you can immediately spot poorly performing SKUs. The trend sparkline gives a quick visual of demand trajectory. Click the eye icon on any row to open the SKU detail modal with full backtest history."

---

### 1.6 SKUDetailModal

**File:** `components/SKUDetailModal.tsx`  
**Data:** `useSKUDetail(skuId)` → `GET /skus/{skuId}`

The backend returns the full SKU detail from `SKU_DETAIL_MAP`, which includes backtest history across 4 runs.

**Modal features:**

#### Section 1: Meta Info (4-column grid)
- **Category** — e.g., "Beverages"  
- **Location** — e.g., "WH-Mumbai-01"
- **Model Used** — e.g., "LightGBM"
- **Demand Pattern** — e.g., "Smooth"

#### Section 2: Key Metrics (4-column grid)
- **MAPE** — color-coded (red/warning/green) with % suffix
- **Forecast Bias** — with +/- prefix
- **P50 Forecast (12w)** — locale-formatted number
- **Recommended Reorder** — locale-formatted number, accent color

#### Section 3: Forecast vs Actuals Chart
- **SKUForecastChart** — LineChart using the SKU's `trend` array as source data
  - Generates weekly data from the SKU's demand trend
  - Last 2 data points show forecast-only (actual = null)
  - Solid line = actual, Dashed line = P50 forecast
  - Custom tooltip with Actual and P50 values
  - 200px height, responsive

#### Section 4: Backtest Accuracy History  
- **Table** with 4 columns:
  - **Run** — e.g., "Run 1 (Apr)", "Run 2 (May)"
  - **MAPE** — percentage
  - **WAPE** — percentage
  - **Status** — colored badge: Good (green) if MAPE < 15, Fair (yellow) if 15-25, Poor (red) if > 25
- Each row links to a specific backtest window
- Empty state: "No backtest history available for this SKU."

**Loading state:** Centered spinner  
**Error state:** AlertTriangle + "Failed to load SKU detail" + Retry button

**What to say:**
> "The SKU detail modal gives a complete picture of a single product's forecast performance. The meta section shows where the SKU is stored and which algorithm is assigned. The KPI section shows the key accuracy metrics. Below that, a line chart compares actuals vs forecast over the last 8 weeks. The backtest history table is particularly valuable — it shows how forecast accuracy evolved over 4 consecutive runs, letting you spot degradation trends early.

> The data comes from `SKU_DETAIL_MAP` in the backend, which enriches the SKU record with a `backtestHistory` array — 4 runs with computed MAPE and WAPE values."

---

## 2. Exceptions & Alerts (`/exceptions`)

**File:** `pages/ExceptionsPage.tsx`  
**Data:** `useExceptions({ limit: 50 })` → `GET /exceptions?limit=50`

The backend returns up to 50 exceptions with `category` and `location` enriched from SKU metadata via `_build_exception_item()`.

**FeaturePageShell:** title="Exceptions & Alerts", description about triaging anomalies, badge shows live count

### Features:

#### Toolbar:
- **Export alert feed button** — secondary, disabled until items selected, simulates export with spinner
- **Resolve button** — primary, shows selected count, disabled until selection, opens resolve modal

#### Filter tabs:
- **All Severities**, **High**, **Medium**, **Low** — pill-style toggle, resets selection on change
- Selection count indicator (e.g., "3 selected")

#### Exception list (left panel):
Each exception card shows:
- **Checkbox** — multi-select for bulk operations, click-to-toggle, click propagation stopped on checkbox
- **AlertTriangle icon** — warning color
- **Title** — `description || sku` (falls back gracefully)
- **Metadata line** — "Category: Beverages · Location: WH-Mumbai-01" (conditionally rendered)
- **Severity badge** — color-coded: High = red/negative, Medium = yellow/warning, Low = blue/info
- **Timestamp** — clock icon + formatted date (e.g., "7/22/2026, 3:15:00 PM"), falls back to "Recent"
- **Investigate link** — clickable "Investigate" button (navigates to investigation workflow)

#### Sidebar (right panel):

**Alert Workflow card:**
- "Auto-detect anomalies" — explains threshold-based detection
- "Route to owners" — explains alert grouping by business owner/SKU family

**Severity counts (3-column grid):**
- High count (red, bold)
- Medium count
- Low count
- Computed live from filtered exceptions

#### Resolve Modal:
- Title: "Resolve Exceptions"
- Body: "Resolve X selected exception(s)? This action cannot be undone."
- **Resolution note textarea** — optional, with placeholder
- **Cancel** button (secondary) and **Resolve** button (primary, with spinner during resolution)
- On resolve: 900ms simulated delay, clears selection, closes modal, refetches data

#### States:
- **Loading:** 4 animated skeleton cards (pulsing shapes for checkbox, text lines, badge)
- **Error:** Red bordered card with "Failed to load exceptions" + error message + "Retry" button
- **Empty (filtered):** CheckCircle2 icon + "All clear!" + "No exceptions match the current filter."

**What to say:**
> "This is the full exception management page. It's designed for triaging forecast quality issues at scale. You can filter by severity to focus on the most critical problems first, multi-select exceptions, and resolve them with an audit trail via resolution notes.

> The side panel explains the alert workflow — exceptions are auto-detected when forecast quality crosses policy thresholds, then routed to the appropriate business owner. The severity counts at the bottom give a quick summary of the distribution.

> In production, the backend pushes exceptions through a real-time pipeline. For this demo, 18 mock exceptions are generated from the same SKU catalog, with realistic types: high-MAPE for SKUs with error > 28%, stockout-risk for critical inventory items, and demand-spike for products with sudden sales jumps."

---

## 3. Model Analytics (`/model-analytics`)

**File:** `pages/ModelAnalyticsPage.tsx`  
**Data:** 
- `useModelAnalytics()` → `GET /model-analytics` → returns `{ metrics: [...], comparison: [...] }`
- `useBacktestResults()` → `GET /backtest-results` → returns `{ lastRun, duration, skuCount, locations, results: [...] }`

**FeaturePageShell:** title="Model Analytics", description about measuring forecast quality, badge="Performance monitoring"

### Features:

#### Toolbar:
- **Refresh button** — refreshes both analytics and backtest data simultaneously via `Promise.all`
- **Run backtest button** — primary, simulates 1.4s backtest run, refetches backtest data

#### KPI Row (6 metric cards, 4-column grid):

| Metric | Value | Delta | Trend |
|--------|-------|-------|-------|
| Forecast Accuracy (WAPE) | 92.4% | +1.8% | Positive (green up arrow) |
| Bias Error | 3.1% | -0.4% | Positive (green up arrow) |
| Service Level Coverage | 97.2% | +2.1% | Positive (green up arrow) |
| Exception Rate | 6.7% | +0.3% | Negative (red down arrow) |
| Avg. Backtest MAPE | 14.8% | -1.2% | Positive (green up arrow) |
| Model Retrain Duration | 4.2 min | -0.8 min | Positive (green up arrow) |

Each card shows: label, trend icon, large value with units, delta text color-coded by trend direction.

**What to say:**
> "The 6 KPI cards give an at-a-glance summary of model health. Most metrics are improving — WAPE accuracy went up 1.8%, bias error decreased, service level improved. The one concern is exception rate, which increased 0.3%. The trend icons make it easy to spot which metrics need attention."

#### Model Performance Comparison (left panel, table):

6 models compared across 4 dimensions:

| Model | Accuracy | Bias | Coverage | Speed |
|-------|----------|------|----------|-------|
| **LightGBM** ✅ Best | 92.1% | 2.8% | 97.0% | Fast |
| ETS | 87.4% | 4.1% | 94.2% | Fast |
| SARIMA | 89.8% | 3.2% | 95.6% | Moderate |
| Moving Avg | 81.2% | 5.8% | 91.1% | Very Fast |
| Croston (Intermittent) | 78.6% | 6.3% | 88.5% | Fast |
| Prophet (Meta) | 90.5% | 3.0% | 96.3% | Moderate |

- **Best model** highlighted with green background and "Best" badge
- Table header has uppercase tracking-wider styling
- Hover effect on rows

**What to say:**
> "This is the core model benchmark. Six algorithms are tested against the same data across 4 backtest windows. LightGBM is the clear winner at 92.1% accuracy — it's fast, accurate, and handles the mixed demand patterns in this FMCG portfolio. Prophet from Meta is close behind at 90.5%, which is notable for its holiday effect handling.

> Critically, no single model is best for everything. Croston's method has the lowest accuracy at 78.6%, but it's specifically designed for intermittent demand — slow-moving or sporadically purchased items. If we removed those SKUs from the benchmark, its relative position would improve. Moving Average is fast but inaccurate for seasonal patterns.

> This comparison drives the algorithm assignment logic — the system can auto-assign the best model per SKU based on its demand pattern."

#### Sidebar (right panel, 3 cards):

**Top Performer card:**
- Title with TrendingUp icon (positive color)
- Model name (large, bold) — e.g., "LightGBM"
- Description: "Outperforms baseline by 4.7% on recent retail demand patterns"
- 3 mini KPI boxes: Accuracy (92.1%), Bias (2.8%), Coverage (97.0%)

**What to say:**
> "The Top Performer card highlights LightGBM as the recommended model for this portfolio, with its three key metrics displayed prominently."

**Attention Area card:**
- Title with Target icon
- Warning box: "Promotion-heavy categories" + "Need another calibration pass to reduce weekly variance during peak events."

**What to say:**
> "This flags a known weakness — our models still struggle with promotion-driven demand spikes. This is a real challenge in FMCG forecasting, and it's flagged here so the team can prioritize it."

**Last Training Run card:**
- Title with Clock icon
- Shows backtest data: last run timestamp, duration, SKU count (117), locations (12)
- Empty state: "Run a backtest to see the latest training details."

**What to say:**
> "This shows when the last backtest completed, how long it took, and the scope — 117 SKUs across 12 locations in about 4 minutes. The backtest re-runs the forecast on historical data to measure accuracy, so this is our ground truth for model performance."

#### States:
- **Error:** Red card with "Failed to load model analytics" + error + "Retry" button
- **Loading (backtest):** Spinner on "Run backtest" button

---

## 4. What-If Scenarios (`/scenarios`)

**File:** `pages/ScenariosPage.tsx`  
**Data:** `useScenarios()` → `GET /scenarios` → returns 12 scenarios

**FeaturePageShell:** title="What-If Scenarios", description about exploring scenarios, badge shows count

### Features:

#### Toolbar:
- **Compare button** — secondary, disabled until 2 scenarios selected, shows count
- **Create scenario button** — primary, opens create modal

#### Scenario list (left panel):

12 scenarios displayed as interactive cards:

| # | Title | Impact | Status |
|---|-------|--------|--------|
| 1 | Promotional Uplift — Republic Day | +12.4% revenue | active |
| 2 | Supplier Disruption — Vendor A | 4 SKUs at risk | active |
| 3 | Price Elasticity — Personal Care | Forecast variance -7.8% | draft |
| 4 | E-Commerce Channel Launch — South | +18.2% volume | active |
| 5 | Festival Surge — Diwali 2026 | +25% demand peak | active |
| 6 | Heatwave Scenario — Q2 2026 | +21.4% beverages | active |
| 7 | New Product Introduction — KitKat Dark | +3.2% category | draft |
| 8 | GST Rate Change Impact | -11.5% volume | archived |
| 9 | Warehouse Consolidation | 5 SKUs re-routed | draft |
| 10 | Monsoon Seasonal Shift | -6.3% snacks | active |
| 11 | Private Label Competition | -7.2% coffee | draft |
| 12 | Export Opportunity — Middle East | +15% utilisation | draft |

Each card:
- **Checkbox** — click to select for comparison (max 2)
- **Title** — truncated with bold
- **Detail text** — full scenario description (e.g., "Model a 20% lift in demand across Beverages and Snacks for Republic Day promotions...")
- **Impact badge** — color-coded by status: active (green), draft (grey), archived (red)
- **Status badge** — "active", "draft", or "archived" in primary color

**What to say:**
> "These 12 scenarios represent the what-if capability. Each scenario is a separate forecast run with modified parameters. Let me walk through a few:

> - **Festival Surge — Diwali 2026** (+25% demand peak): This assumes a 30% lift on Snacks, 20% on Oils & Ghee, and 15% on Beverages for 6 weeks around Diwali. The procurement team uses this to plan advance inventory.
> - **Supplier Disruption — Vendor A** (4 SKUs at risk): Simulates a 2-week delay from the primary packaging supplier. This feeds into risk mitigation discussions.
> - **GST Rate Change Impact** (-11.5% volume): Tests what happens if GST on confectionery increases from 12% to 18%.
> - **Private Label Competition** (-7.2% coffee): Models the impact of a retailer launching their own instant coffee at 30% lower price."

#### Interaction:
- **Click card** → toggles checkbox for comparison
- **Max 2 selections** enforced
- **Compare button** becomes active when exactly 2 selected

#### Scenario Summary (right panel):
- **Two static info cards:**
  - "Expected service improvement" (+3.2 points projected)
  - "Inventory resilience" (91% portfolio protected)
- **Comparison panel** (appears when 2 scenarios selected):
  - Title: "Comparison: Scenario A vs Scenario B"
  - 2-column grid: each shows "Revenue Impact" with the scenario's impact value
  - Highlighted with primary border/background

#### Create Scenario Modal:
- Simple modal overlay with backdrop
- **Title input** — "Scenario title" with placeholder
- **Detail textarea** — 3 rows, "Describe the business assumptions..."
- **Cancel** button (secondary) + **Create** button (primary, with spinner)
- 1.2s simulated creation delay, then refetches list

#### States:
- **Loading:** 3 skeleton cards (pulsing title bar, detail bar, badge circle)
- **Error:** Red card with "Failed to load scenarios" + "Retry" button
- **Empty:** Zap icon + "No scenarios yet" + "Create your first what-if scenario..."

---

## 5. Data Sources (`/data-sources`)

**File:** `pages/DataSourcesPage.tsx`  
**Data:** 
- `useDataSources()` → `GET /data-sources` → returns 10 sources
- `useCreateDataSource()` → `POST /data-sources`
- `useRefreshDataSource()` → `POST /data-sources/{id}/refresh`
- `useDeleteDataSource()` → `DELETE /data-sources/{id}`

**FeaturePageShell:** title="Data Sources", description about connecting data, badge shows connected count

### Features:

#### Toolbar:
- **Add data source button** — primary, opens "Add data source" modal

#### Source list (left panel):

10 data sources rendered as cards:

| Name | Type | Status | Freshness | Last Sync |
|------|------|--------|-----------|-----------|
| SAP ERP — Sales Orders | ERP | Connected | 2 min ago | (formatted) |
| POS Retail Feed — All India | POS | Syncing | 12 sec ago | (formatted) |
| Supplier Collaboration Portal | Supplier | Connected | 18 min ago | (formatted) |
| Warehouse WMS API | API | Connected | 5 min ago | (formatted) |
| Manual Uploads — Distributor | Manual | Disconnected | 2 days ago | (formatted) |
| E-Commerce — Amazon India | API | Connected | 1 min ago | (formatted) |
| E-Commerce — Flipkart | API | Syncing | 45 sec ago | (formatted) |
| Weather Data — IMD Feed | API | Error | 3 hours ago | (formatted) |
| Promotional Calendar — Marketing | Manual | Connected | 1 hour ago | (formatted) |
| Transportation TMS | API | Connected | 22 min ago | (formatted) |

Each card:
- **Type icon** — ERP (Database), POS (PlugZap), Supplier (Clock), API (RefreshCw), Manual (Database)
- **Source name** (truncated)
- **Metadata** — "Type · Freshness · Last sync {datetime}"
- **Status badge** — color-coded: Connected (green with Wifi icon), Syncing (blue with animated spinner), Error (red with AlertCircle), Disconnected (grey with WifiOff icon)
- **Refresh button** — icon button, shows spinner during refresh, disabled while another refresh is in progress
- **Delete button** — trash icon, "Are you sure?" confirm, fades out while deleting, disabled during operations

#### Pipeline Health (right panel):
- **RefreshCw icon** + "Pipeline health"
- **Dynamic freshness status:**
  - If errors > 0: degraded (yellow), showing error count
  - If syncing > 0: shows syncing count
  - Otherwise: healthy (green)
- **Integration status** — "The next forecast run will consume the latest ERP and POS data..."

#### Stat Cards (2-column grid):
- **Total Sources** — live count
- **Connected** — live count (green text)

#### Add Data Source Modal:
- Title: "Add data source"
- **Name input** — text field, required, placeholder "e.g. ERP Sales"
- **Type select** — dropdown with options: ERP, POS, Supplier, API, Manual
- **Cancel** + **Connect** button (with spinner)
- Form is reset on successful add
- Refetches the full list

#### States:
- **Loading:** 3 skeleton cards (type icon, name, badge)
- **Error:** AlertCircle + "Failed to load data sources" + error + "Retry"
- **Empty:** Database icon + "No data sources configured" + helper text
- **Deleting:** Card fades to 50% opacity while removal is in progress

**What to say:**
> "This page is the data pipeline control center. Every data source feeding the forecast engine is listed here with its health status. The 5 source types mirror a real FMCG data landscape:

> - **ERP (SAP):** The primary demand signal — sales orders and inventory levels.
> - **POS (Point of Sale):** Near-real-time retail sales data — crucial for detecting trends early.
> - **Supplier Portal:** Lead time and supply availability data.
> - **API sources:** Warehouse WMS, e-commerce platforms (Amazon, Flipkart), and even weather data — because weather directly impacts beverage and frozen food demand.
> - **Manual:** Distributor uploads and promotional calendars.

> Notice **Weather Data** is in Error state (3 hours stale). This will affect forecast accuracy for weather-sensitive categories. The planner can click the refresh button to retry the connection. The pipeline health panel dynamically updates — currently 1 source has errors, which degrades our freshness status.

> The Add Data Source form lets you connect new sources on the fly by specifying a name and type."

---

## 6. Configuration Panel (`/configuration-panel`)

**File:** `pages/ConfigurationPanelPage.tsx`  
**Data:** 
- `useConfiguration()` → `GET /configuration`
- `useSaveConfiguration()` → `PUT /configuration`

**Note:** This page renders without the `AppLayout` wrapper (full-screen with its own loading state).

**FeaturePageShell:** title="Configuration Panel", description with tenant info

### Features:

#### Toolbar:
- **Unsaved changes badge** — appears (yellow warning) when config is modified
- **Reset to defaults button** — secondary, resets to empty AppConfig
- **Save Configuration button** — primary, disabled until changes made, shows animated spinner while saving, shows "Saving…" text

#### Tab Navigation (4 tabs):
1. **Data & Granularity** (Database icon)
2. **Business Context** (Briefcase icon)
3. **Modeling** (Cpu icon)
4. **Output & Alerting** (Bell icon)

#### Tab 1: Data & Granularity

**Time Granularity & Horizon card:**
- **Time Granularity** — 3 toggle buttons: Daily, **Weekly** (default), Monthly. Each has tooltip explanation.
- **Aggregation Hierarchy** — dropdown: SKU only, **SKU × Location** (default), SKU × Location × Channel, Category × Location
- **Forecast Horizon** — range slider + number input (linked). Dynamic min/max based on granularity: daily (7-90), weekly (4-52), monthly (1-24). Tooltip explains: "Longer horizons produce wider prediction intervals."
- **History Window** — range slider (26-260 weeks) + number input. Tooltip: "More history improves seasonal detection." Minimum recommended label: "2× seasonal period + forecast horizon." Range labels: "26w (6 months)" to "260w (5 years)"

**Configuration Summary card:**
- 4-column grid showing current values: Granularity (weekly), Horizon (12w), History (104w), Hierarchy (sku-location)
- Primary-colored border/background

#### Tab 2: Business Context

**Industry & Lead Times card:**
- **Industry Template** — dropdown: **FMCG** (default), Auto Parts, Pharmaceuticals, Custom. Tooltip: "Pre-configured settings for your industry vertical"
- **Default Lead Time** — number input (14 days default). Tooltip: "Standard supplier lead time used for reorder calculations"
- **Shelf Life** — number input (90 days default). Tooltip: "Product shelf life for perishable goods planning"
- **MOQ** — number input (50 default). Tooltip: "Minimum order quantity enforced by suppliers"
- **Service Level Target** — number input (97.5% default). Tooltip: "Target in-stock probability for safety stock calculations"
- **Promo Calendar Enabled** — checkbox (enabled by default). Tooltip: "Include promotional events in forecast adjustments"

**Holidays card:**
- Pre-populated with 5 holidays: 2026-01-26 (Republic Day), 2026-08-15 (Independence Day), 2026-10-02 (Gandhi Jayanti), 2026-11-14 (Diwali), 2026-12-25 (Christmas)
- Each row: date input + delete button (X icon)
- **Add holiday button** — adds "2026-12-25" as a new row

#### Tab 3: Modeling

**Algorithm & Settings card:**
- **Algorithm Mode** — 2 toggle buttons: **Auto** (default), Manual. Tooltip: "Auto selects the best model per SKU; Manual lets you pick one"
- **Selected Algorithm** — dropdown: LightGBM, ETS, SARIMA, Moving Average, Croston. Disabled when mode is Auto. Tooltip: "Model to use when algorithm mode is manual"
- **Seasonality Mode** — dropdown: **Auto-detect** (default), Weekly, Monthly, Yearly, None. Tooltip: "How to detect and model seasonal patterns"
- **Outlier Treatment** — dropdown: None, **Winsorize** (default, caps at percentiles), Remove. Tooltip: "How to handle outliers in historical data"
- **External Regressors** — checkbox (enabled by default). Tooltip: "Include external factors like promotions, weather, holidays"
- **Intermittent Routing** — checkbox (disabled by default). Tooltip: "Automatically route intermittent SKUs to Croston's method"
- **Backtesting Window** — number input (8 weeks default). Tooltip: "Periods used for backtesting model accuracy"
- **Retraining Frequency** — dropdown: **Weekly** (default), Bi-weekly, Monthly. Tooltip: "How often to retrain models with new data"
- **Prediction Intervals** — checkbox (enabled by default). Tooltip: "Generate confidence intervals (p10/p90) for forecasts"
- **Hierarchical Reconciliation** — dropdown: None, **Bottom-up** (default), Top-down, Middle-out. Tooltip: "Method to reconcile forecasts across hierarchy levels"

#### Tab 4: Output & Alerting

**Accuracy & Exceptions card:**
- **Primary Accuracy Metric** — dropdown: **WAPE** (default), MAPE, MASE, Bias. Tooltip: "Metric used for model selection and monitoring"
- **Exception Threshold** — number input (25% default). Tooltip: "SKUs with MAPE above this threshold are flagged as exceptions"
- **Reorder Formula** — dropdown: Fixed, **Dynamic** (default, forecast-based), Safety Stock Based. Tooltip: "Method for calculating reorder quantities"

**Notifications card:**
- **Notification Channel** — dropdown: **Email** (default), Slack, Webhook, None. Tooltip: "Where to send exception alerts"
- **Notification Email** — email input (default: "anika.patel@nestle-india.com"). Tooltip: "Email address for alert notifications"

#### Live JSON Preview Panel (sticky sidebar):
- Title: "Live JSON Preview" with "Updates as you edit" label
- `<pre>` block showing `JSON.stringify(config, null, 2)` with monospace font, max 500px height with scroll
- Updates in real-time as any setting changes

#### States:
- **Loading:** Full-screen centered spinner, no FeaturePageShell
- **Error:** FeaturePageShell with error message + "Retry" button
- **Save:** Toast notification on success ("Configuration saved") or error
- **Reset:** Toast notification ("Configuration reset to defaults")

**What to say:**
> "The Configuration Panel is the engine room of the forecast system. Every setting here changes how the forecast is computed. Let me highlight the key decisions:

> **Granularity (Tab 1):** We use weekly — the standard for FMCG. Daily would be too noisy; monthly would miss weekly patterns. The hierarchy is SKU × Location, meaning we forecast each product at each warehouse independently.

> **Industry Template (Tab 2):** FMCG pre-sets optimal defaults. If this were Pharma, we'd use monthly granularity with Croston for intermittent demand. The holidays are country-specific — Republic Day, Diwali, etc. — and affect seasonal adjustments.

> **Algorithm (Tab 3):** We use Auto mode, which selects the best model per SKU based on its demand pattern. The external regressors checkbox lets us include weather and promotion data. Prediction intervals generate the P10/P90 bands you saw in the forecast chart.

> **Alerting (Tab 4):** The exception threshold of 25% MAPE determines which SKUs appear on the Exceptions page. Setting it lower would catch more issues but create more noise.

> The JSON preview panel on the right shows the raw configuration object that gets sent to the engine — it updates live as you make changes."

---

## 7. Export & Integrate (`/export`)

**File:** `pages/ExportPage.tsx`  
**Data:** `useExportPackages()` → `GET /export-packages` → returns `{ packages: [...], integrations: [...] }`

**FeaturePageShell:** title="Export / Integrate", description about downstream delivery, badge shows ready count

### Features:

#### Toolbar:
- **Format filter tabs** — All (default), CSV, XLSX, JSON — pill-style toggle
- **Publish package button** — primary, simulates 1.6s publish, refetches list

#### Export Packages (left panel):

8 packages listed as cards:

| Name | Format | Status | Size | Updated |
|------|--------|--------|------|---------|
| Forecast Snapshot — All SKUs | CSV (FileText) | ✅ Ready | 2.4 MB | (formatted) |
| Replenishment Plan — Jul Wk 4 | XLSX (FileSpreadsheet) | ✅ Ready | 1.8 MB | (formatted) |
| Alert Payload — JSON Feed | JSON (FileJson) | ✅ Ready | 0.6 MB | (formatted) |
| Full Backtest Results — Q2 2026 | CSV | 🔄 Generating | — | (formatted) |
| Accuracy Report — Category Level | XLSX | ✅ Ready | 1.1 MB | (formatted) |
| Safety Stock Recommendations | CSV | ✅ Ready | 0.8 MB | (formatted) |
| Exception Log — Past 7 Days | CSV | ✅ Ready | 0.3 MB | (formatted) |
| Scenario Comparison — Diwali 2026 | XLSX | ❌ Failed | — | (formatted) |

Each card:
- **Format icon** — colored background
- **Package name** (truncated)
- **Metadata** — "Format · Size · Updated {datetime}"
- **Status badge** — Ready (green with CheckCircle), Generating (blue with animated spinner), Failed (red with AlertCircle)
- **Download button** — icon button, enabled only when status is "ready", simulates 1s download

**Filtering:** Filter buttons at top update the list. "All" shows all, format-specific shows only matching packages.

#### Integrations (right panel):

**Integration Channels card:**
8 integrations listed:

| Name | Status | Icon |
|------|--------|------|
| SAP ERP | Connected | ArrowRightLeft |
| Slack Alerts | Enabled | Download |
| Power BI | Scheduled refresh | RefreshCw |
| Webhook — Custom | Configured | Clock |
| AWS S3 Data Lake | Connected | Database |
| Google Sheets | Disconnected | FileSpreadsheet |
| Tableau Server | Connected | BarChart3 |
| Zapier Automation | Enabled | Zap |

Each row: icon + name (bold) + status text

**Delivery status card:**
- ShieldCheck icon (green)
- "Delivery status healthy"
- "Exports are authenticated, compressed, and ready for downstream consumption."

#### Stat Cards (2-column grid):
- **Ready Exports** — live count of packages with status "ready"
- **Integrations** — total integration count

#### States:
- **Loading:** 3 skeleton cards (type icon, name, badge)
- **Error:** AlertCircle + "Failed to load export packages" + error + "Retry"

**What to say:**
> "This page manages how forecast outputs reach other systems. 8 export packages are available in 3 formats — CSV for analysis, XLSX for stakeholders, JSON for API consumption. The format filters let you narrow down by type.

> The backend manages the package lifecycle — ready packages can be downloaded, generating packages show a progress spinner, and failed packages are flagged. The data comes from `mock_data.py` which generates 8 realistic packages with names, sizes, and statuses.

> On the integrations side, 8 downstream systems are configured — from SAP ERP (the primary consumer) to Slack Alerts for exception notifications, Power BI for executive dashboards, and AWS S3 for data lake storage. The delivery status indicator confirms end-to-end health."

---

## 8. Onboarding Wizard (`/onboarding-wizard`)

**File:** `pages/OnboardingWizardPage.tsx`  
**Data:** `useOnboarding()` → `POST /onboarding`

This page renders **without** the AppLayout — it has its own minimal header with the ForecastIQ logo and "Back to Dashboard" link.

### Features:

#### Step Indicator (horizontal stepper):
- 4 steps with numbered circles: 1✅ Workspace → 2 Connect Data → 3 Map Schema → 4 Confirm & Launch
- Completed steps: filled primary circle with checkmark
- Current step: outlined with primary border
- Future steps: grey/muted
- Connecting lines between steps: primary if completed, grey if not
- Labels and descriptions visible on desktop

#### Step 1: Workspace

**Name your workspace:**
- **Workspace name** — text input with "Nestle India FMCG" placeholder. Required (next button disabled if empty)
- **Industry template** — 4 selectable cards with emoji icons:
  - 🏭 **FMCG** — "Fast-Moving Consumer Goods" → weekly, lightgbm, 12wk horizon
  - 🚗 **Auto Parts** — "Automotive components" → monthly, croston, 8wk horizon
  - 💊 **Pharma** — "Pharmaceuticals" → monthly, sarima, 16wk horizon
  - ⚙️ **Custom** — "Other industry" → weekly, auto, 12wk horizon

Each card: Emoji (2xl), label (bold), description. Selected card gets primary border + background tint + ring indicator.

**"Next step →"** button — disabled until workspace name is entered.

**What to say:**
> "The onboarding wizard handles first-time tenant setup. Step 1 asks for a workspace name and industry. Notice how the industry template pre-populates optimal settings — FMCG gets weekly granularity with LightGBM, while Auto Parts gets monthly with Croston. This encodes domain expertise into the setup process."

#### Step 2: Connect Data

**Connect your data:**
- **Connect API button** — secondary, shows intent (not fully implemented in demo)
- **Sample data button** — secondary, shows intent (not fully implemented in demo)
- **Drag-and-drop upload zone**:
  - Empty state: Upload icon + "Drop your file here, or click to browse" + "Supports CSV and Excel files (max 50MB)"
  - File selected: shows filename, file size in KB, "Remove" button (red ghost)
  - Dragging over: primary border + background tint
  - **Note:** Actual file click-to-browse is not wired (drag-and-drop only in this demo)

**Navigation:** "← Back" + "Next step →" buttons

**What to say:**
> "Step 2 handles data ingestion. You can connect a live API source or upload a CSV/Excel file. The drag-and-drop zone provides visual feedback. In production, this would connect to the tenant's actual data sources — ERP exports, POS feeds, or historical data files."

#### Step 3: Map Schema

**Map your schema:**
- Table with 3 columns:
  - **Forecast Field** — Date/Week (required), SKU/Product ID (required), Demand/Sales (required), Price (optional), Promo flag (optional)
  - **Source Column** — dropdown select with options: date, product_id, sales_units, price, promotion_flag
  - **Required** — "Required" (red text) or "Optional" (grey text)
- Each row lets you map the source column name to the forecast engine field
- **Info box:** "The three required fields are essential for the forecast engine. Optional fields improve accuracy when available." (blue border, Info icon)

**What to say:**
> "Schema mapping is critical — the forecast engine needs to know which column is the date, which is the SKU identifier, and which contains the demand values. The optional fields (price and promo flag) improve accuracy when available but aren't required. The dropdowns show the detected source columns from the uploaded file."

#### Step 4: Confirm & Launch

**Confirm & launch:**
- **Workspace summary** — name + industry
- **Data summary** — uploaded filename (or "No file uploaded") + column mapping count
- **Forecast Configuration** — 4-item grid: Granularity (weekly), Horizon (12 periods), Algorithm (lightgbm), Seasonality (Enabled/Disabled)
- **Ready to launch box:** Building2 icon + "A forecast run will be created with your configuration. You can also adjust any setting later from the Configuration Panel."
- **"← Back"** button
- **"Launch Forecast Run"** button:
  - Calls `launchOnboarding(state)` via the API
  - Shows spinner + "Launching…" text while executing
  - On success: toast notification + redirects to dashboard after 2.5s
  - On error: toast with error message

**What to say:**
> "The final step shows a comprehensive review of all selections before launching the first forecast run. The configuration summary shows granularity, horizon, algorithm, and seasonality settings derived from the industry template. Clicking 'Launch Forecast Run' triggers the backend onboarding endpoint, which would create the tenant workspace and start the initial forecast."

---

## 9. NotFoundPage (`*`)

**File:** `pages/NotFoundPage.tsx`  
**Route:** Catch-all for undefined paths

A simple 404 page for unrecognized routes.

---

## Appendix: Data Architecture

### Backend Data Flow
```
mock_data.py (centralized generators)
  → routes/*.py (FastAPI endpoints)
    → frontend/lib/api-client.ts (HTTP client)
      → frontend/lib/api-hooks.ts (React hooks with stable refetch)
        → pages/*.tsx (UI components)
```

### Key Data Entities

| Entity | Count | Fields |
|--------|-------|--------|
| SKUs | 117 | id, skuId, name, category, location, mape, bias, p50Forecast, reorderQty, safetyStock, model, pattern, lastActual, trend[] |
| Categories | 9 | Beverages, Dairy, Snacks, Frozen, Personal Care, Condiments, Rice & Grains, Oils & Ghee, Cleaning & Household |
| Warehouses | 12 | WH-Mumbai-01 through WH-Bhopal-12 |
| Timeseries | 52 weeks | week, actual (40 wks), p50, p10, p90 |
| Exceptions | 18 | id, skuId, name, type, severity, mape/daysToStockout/spikeMultiple, timestamp |
| Scenarios | 12 | id, title, detail, impact, status, createdAt |
| Data Sources | 10 | id, name, status, freshness, type, lastSync |
| Export Packages | 8 | id, name, format, status, updatedAt, size |
| Integrations | 8 | name, status, icon |
| Model Metrics | 6 | label, value, delta, trend |
| Model Comparison | 6 models | name, accuracy, bias, coverage, speed |

### Forecasting Algorithms

| Algorithm | Best For | Accuracy | Speed |
|-----------|----------|----------|-------|
| LightGBM | High-volume smooth demand | 92.1% | Fast |
| Prophet (Meta) | Seasonal patterns with holidays | 90.5% | Moderate |
| SARIMA | Strong seasonal patterns | 89.8% | Moderate |
| ETS | Smooth, trended demand | 87.4% | Fast |
| Moving Average | Very stable, low-variance items | 81.2% | Very Fast |
| Croston | Intermittent, sporadic demand | 78.6% | Fast |

### Forecast Engine (`forecast_engine.py`)
The backend contains a real statistical forecasting engine that:
- Computes **exponential smoothing** forecasts with configurable alpha
- Detects **seasonality** via autocorrelation
- Calculates **WAPE, MAPE, and Bias** from actual vs forecast arrays
- Generates **synthetic weekly data** with trend, seasonality, and noise
- Produces **P10/P90 prediction intervals** based on residual standard deviation

---

## Appendix: Presentation Flow by Audience

### For Business Stakeholders (15 min)
1. **Dashboard** (5 min) — Focus on KPIs, especially WAPE and Service Level. Show the exceptions panel. The scenario page is the key business tool.
2. **Scenarios** (5 min) — Walk through Festival Surge, Supplier Disruption, and one negative scenario. Emphasize S&OP decision support.
3. **Export** (2 min) — Show how forecasts reach ERP and BI systems.
4. **Model Analytics** (3 min) — Briefly show the comparison table, explain why it matters.

### For Data Scientists (20 min)
1. **Model Analytics** (8 min) — Deep dive into the comparison table. Explain backtest methodology, algorithm trade-offs, how LightGBM vs Croston handle different demand patterns.
2. **SKU Detail Modal** (5 min) — Show backtest history over 4 runs. Explain how accuracy degrades or improves.
3. **Configuration Panel** (5 min) — Walk through every modeling setting: algorithm mode, seasonality, outlier treatment, hierarchical reconciliation.
4. **Dashboard** (2 min) — Show how model performance manifests in the KPI grid.

### For Implementation Teams (20 min)
1. **Data Sources** (5 min) — Show the 10 sources, types, health indicators. Demonstrate add/refresh/delete.
2. **Onboarding Wizard** (5 min) — Walk through all 4 steps. Show how industry template pre-sets config.
3. **Configuration Panel** (5 min) — Full walkthrough of all 4 tabs.
4. **Exceptions** (3 min) — Show the triage workflow (filter, select, resolve).
5. **Export** (2 min) — Show the integration channels and export lifecycle.
