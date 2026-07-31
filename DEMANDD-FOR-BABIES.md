# Demand Forecasting Platform — Explained Like You're 5

Imagine you run a giant grocery store. Every week, you need to know how much milk, cereal, and chips to order. Order too little and customers get angry. Order too much and it rots in the warehouse. This app predicts the future — it tells you exactly how much of each product people will buy next week, next month, and beyond.

---

## 1. The Data: What the App Learns From

### The M5 Dataset (our "school textbook")

The app learns from real Walmart sales data called **M5 Accuracy**. It's like a giant diary of everything people bought for 5 years (2011–2016):

- **117 products** (we call them SKUs — "Stock Keeping Units"). Think of them as 117 different items like "Original Lay's Chips 200g" or "Coca-Cola 12-pack".
- **3 categories**: Foods (39 items), Hobbies (39 items), Household (39 items)
- **4 stores** (CA_1, CA_2, CA_3, CA_4, TX_1, TX_2, TX_3, WI_1, WI_2, WI_3) — 10 store locations across different states
- **274 weeks** of sales history (that's over 5 years of data)
- **Prices** — what each product was sold for each week
- **Calendar events** — like holidays, weekends, special events

The original M5 dataset has 30,490 products. We use a smaller sample of 117 so the app runs fast on your computer.

### How the data gets in

Raw CSV files (think Excel spreadsheets) sit in the `dataset/` folder. When you start the app, a Python script reads them, does some math (like converting daily sales to weekly totals), and caches the result in a fast binary format (Parquet). Next time you start, it loads in 2 seconds instead of 30.

---

## 2. How the App is Built

Think of the app as a restaurant:

```
┌────────────────────────────────────────────────┐
│  FRONTEND (Kitchen)                             │
│  Next.js + React + TypeScript + Tailwind CSS    │
│  Runs on http://localhost:4028                  │
│  What you see and click in your browser         │
└────────────────┬───────────────────────────────┘
                 │  Waiter (API calls)
                 ▼
┌────────────────────────────────────────────────┐
│  BACKEND (Chef)                                 │
│  Python + FastAPI + Uvicorn                     │
│  Runs on http://localhost:8000                  │
│  Does all the math and thinking                 │
└────────────────┬───────────────────────────────┘
                 │  Ingredients
                 ▼
┌────────────────────────────────────────────────┐
│  DATA (Fridge)                                  │
│  M5 Dataset + Forecast Engine + ML Models       │
│  Stores everything in memory for speed          │
└────────────────────────────────────────────────┘
```

### The Backend (Python Chef)

The backend is a **Python program** running on port 8000. It uses FastAPI (like a waiter that takes orders and brings food). All the numbers-crunching happens here.

**Key kitchen tools:**
| File | What it does |
|---|---|
| `main.py` | The head chef — starts the app, connects all the routes |
| `models.py` | Recipe book — defines exactly what data looks like |
| `forecast_engine.py` | The math wizard — does Holt-Winters, ARIMA, Croston forecasts |
| `ml_forecast.py` | The AI specialist — uses LightGBM and Prophet (Facebook's forecasting tool) |
| `data/m5_loader.py` | The ingredient prepper — reads CSV files and prepares data |
| `data/m5_data.py` | The central fridge — keeps all data ready for any route to grab |

**Forecasting methods used (from simple to smart):**
1. **Naive** — just repeat last week's number
2. **Seasonal Naive** — repeat the same week from last year
3. **Holt-Winters** — smart exponential smoothing (fancy averaging)
4. **ARIMA** — AutoRegressive Integrated Moving Average (a classic stats model)
5. **Croston** — special method for products that sell sporadically (like fire extinguishers)
6. **Prophet** — Facebook's AI forecasting tool
7. **LightGBM** — a super-fast AI that learns patterns from features (lags, trends, seasonality)

When one method fails, the app automatically tries the next one (fallback chain).

### The Frontend (Next.js Kitchen)

The frontend is a **React app** running on port 4028. It uses Next.js (a framework for React), TypeScript (JavaScript with safety training wheels), and Tailwind CSS (pre-made pretty styles).

**Key files:**
| File | What it does |
|---|---|
| `App.tsx` | The map — defines all the pages and routes |
| `lib/api-client.ts` | The waiter — talks to the backend |
| `lib/api-hooks.ts` | Order takers — React hooks that fetch data and manage loading/error states |
| `lib/api-types.ts` | Menu — TypeScript types that match the backend models exactly |
| `components/Sidebar.tsx` | The navigation menu on the left |
| `components/AppLayout.tsx` | The frame around every page (sidebar + top bar + content) |

---

## 3. All the Pages (What You Can Do)

The sidebar has **8 groups** of pages. Here's every page explained simply:

### 📊 Overview

#### Forecast Dashboard (`/`)
The **home page**. When you open the app, this is what you see. It shows:
- **KPI cards**: Overall forecast accuracy (MAPE = average error %), total forecast value, bias (are we over or under predicting?)
- **Forecast chart**: A line chart of actual sales vs. predicted sales over time
- **Exceptions panel**: A mini version of the Exceptions page
- **SKU table**: A searchable list of all 117 products with their forecast details

You can filter by category (Foods/Hobbies/Household) and location (store).

---

### 🔍 Monitoring

#### Exceptions & Alerts (`/exceptions`)
Like a **fire alarm system**. The app automatically detects problems:
- **High MAPE** — the forecast for this product is very wrong (>22% error)
- **Stockout Risk** — we might run out of this product soon (<5 days of stock)
- **Demand Spike** — sales suddenly jumped way up (>3x normal)

**What you can do:**
- Select exceptions and click **Resolve** (with a note explaining what happened)
- **Acknowledge** — "I see this, I'll handle it later"
- **Dismiss** — "This isn't a real problem"
- **Export** — download the alert list
- **Investigate** — click through to the product detail page

#### Model Analytics (`/model-analytics`)
The **report card** for the forecasting engine. Shows:
- **KPI metrics** with trend arrows (up/down — is accuracy improving or getting worse?)
- **Accuracy drift** — how much has our forecast accuracy changed over time
- **Model comparison** — a table comparing all forecasting models (Naive, ARIMA, Prophet, LightGBM) on accuracy, bias, coverage, and speed
- **Backtest results** — how well our model would have done if we tested it on old data

---

### 🔮 Forecasting

#### What-If Scenarios (`/scenarios`)
Like a **strategy whiteboard**. Business leaders can jot down ideas:
- "What if we reduce beverage prices by 12%?"
- "What if we increase safety stock for snacks?"
- "What if we discontinue low-margin products?"

Each scenario has a title, description, and expected impact. You can create, edit, and delete scenarios.

#### Simulation Engine (`/simulations`)
The "what if" **math lab**. Unlike scenarios (which are just notes), simulations actually **recalculate the forecast** with changed parameters:

- **Promo Lift**: How much would sales increase if we ran a promotion?
- **Price Change**: What happens to demand if we change the price? (Uses price elasticity = -1.5 — meaning if you drop price 10%, demand goes up 15%)
- **Demand Shift**: What if overall demand jumps or drops by a percentage?

You pick a preset, name it, and click "Run Simulation." The app shows you a before/after chart and the exact impact percentage.

#### Consensus Forecast (`/consensus`)
The **wisdom of the crowds**. Instead of relying on one forecasting method, this blends three:
1. **ML Forecast** (AI — Prophet/LightGBM)
2. **Statistical Forecast** (classic math — Holt-Winters/ARIMA)
3. **Judgmental Forecast** (human experts — entered via the Collaboration page)

The blend is **adaptive** — if ML has been more accurate lately, it gets more weight. If Statistical has been better, that gets more weight. The weights adjust automatically based on each model's recent MAPE.

---

### 📈 Analytics

#### Walk-Forward Backtest (`/backtesting`)
A **time machine test**. Instead of testing the forecast on old data all at once, it rolls the data window forward like a treadmill:

```
Test 1: Train on weeks 1-100 → Predict weeks 101-108
Test 2: Train on weeks 9-108 → Predict weeks 109-116
Test 3: Train on weeks 17-116 → Predict weeks 117-124
...and so on
```

This tells you how stable your forecast is. A **stability score** near 100 means the forecast is equally accurate across all time periods. Low stability means the forecast is unreliable for some periods.

#### Seasonality Decomposition (`/seasonal-decomposition`)
Shows the **hidden patterns** in your sales data. Every product's sales history is split into three components:
- **Trend**: Is this product selling more or less over time? (upward/downward direction)
- **Seasonal**: Does it have a yearly pattern? (ice cream sells more in summer)
- **Residual**: What's left over — random noise or special events

For each SKU you see a chart with the actual sales line overlaid with the trend line, plus a separate chart of the seasonal pattern.

#### Demand Sensing (`/demand-sensing`)
A **short-term radar**. While the main forecast looks weeks/months ahead, Demand Sensing looks at immediate signals:
- **POS data**: What's scanning at the cash register right now
- **Sell-in**: What retailers are ordering from us
- **Sell-out**: What's actually selling to consumers
- **Stock levels**: What's sitting in stores and warehouses

These signals are blended together (with configurable weights) to create a "sensed" demand number that's more accurate for the next few weeks than the regular forecast.

#### External Factors (`/external-factors`)
Things **outside your business** that affect demand. The app tracks 8 factors:
1. **Temperature** — weather effects
2. **Precipitation** — rain/snow
3. **GDP Growth** — economy
4. **Unemployment** — jobs
5. **Consumer Confidence** — how people feel about spending
6. **Competitor Price** — what rivals are charging
7. **Competitor Promotion** — rivals' marketing activity
8. **Holiday Flag** — is it a holiday?

For each factor and each SKU, the app calculates a **correlation** (a number from -1 to 1 showing how much they're related). You can turn factors on/off to see how they affect the forecast.

---

### 🏭 Operations

#### Inventory Optimization (`/inventory`)
The **stock calculator**. For every product, it figures out:
- **Safety Stock**: Extra inventory to keep as a buffer against unexpected demand
- **Reorder Point**: When stock drops to this level, place a new order
- **EOQ (Economic Order Quantity)**: The most cost-efficient order size
- **Fill Rate**: The percentage of customer demand we can meet from stock
- **Stockout Probability**: The chance we'll run out

You can adjust two sliders:
- **Service Level** (80%–99.9%): How often do you want to meet demand? Higher = more stock
- **Lead Time** (1–90 days): How long does it take to get new stock?

---

### 📋 Data & Setup

#### Data Sources (`/data-sources`)
The **plumbing panel**. Shows all the places data comes from:
- SAP ERP (production system)
- POS Feed (cash register data)
- Supplier Portal
- Demand Sensing API
- Warehouse WMS
- Promotion Calendar (Excel file)

Each source shows its status (Connected/Syncing/Error/Disconnected) and freshness (when it was last updated). You can refresh, delete, or add new data sources.

#### Configuration (`/configuration-panel`)
The **control room**. A full settings page with tabs:
- **Data & Granularity**: What time unit (weekly/monthly), how far to forecast
- **Business Context**: Which algorithm to use, seasonality settings, special events
- **Modeling**: Holdout weeks, confidence intervals, feature engineering
- **Output & Alerting**: Thresholds for exceptions, notification settings

Everything is saved via a big form with sliders, dropdowns, and checkboxes.

#### Onboarding Wizard (`/onboarding-wizard`)
The **first-time setup** guide. When you start using the app for the first time, this 4-step wizard helps you:
1. Name your workspace and pick an industry (FMCG/Auto/Pharma/Custom)
2. Upload a data file (CSV/Excel) or load the sample M5 data
3. Map your spreadsheet columns to the forecast fields (date column → date, sales column → sales, etc.)
4. Review everything and launch the forecast

---

### 👥 Collaboration

#### Annotations & Overrides (`/collaboration`)
The **team chat room** for forecasters. Three tools:
- **Annotations**: Leave notes on specific SKUs — "Promotion running next week, expect +20%"
- **Overrides**: Manually adjust a forecast number. If the computer predicts 100 units but you know there's a promotion, you can override it to 120. Overrides go through an **approval workflow** (someone needs to approve before it takes effect).
- **Threaded Discussions**: Start a conversation about a specific SKU — "Why did sales drop last week?" → "Supplier had a delay" → "OK, let's adjust the forecast"

---

### 🔌 Integrations

#### Export / Integrate (`/export`)
The **shipping dock**. You can export forecasts and reports as:
- **CSV** (Excel-compatible)
- **XLSX** (Excel format)
- **JSON** (for other apps)

And send them to integrations like SAP, Salesforce, or custom APIs.

#### User Journey (`/user-flow`)
The **map of the app**. A visual guide showing all the pages organized in 4 phases:
1. **Phase 1 — Setup & Connect**: Onboarding, Data Sources, Configuration
2. **Phase 2 — Monitor, Plan & Forecast**: Dashboard, Exceptions, Scenarios, Simulations, Consensus
3. **Phase 3 — Deep Analytics & Optimization**: Backtesting, Seasonality, Demand Sensing, External Factors, Inventory
4. **Phase 4 — Collaborate & Export**: Collaboration, Export

Click any step to jump directly to that page.

---

## 4. How Everything Connects (The Data Flow)

Here's what happens when you open a page:

```
YOU click "Exceptions & Alerts"
        │
        ▼
Frontend calls: GET /api/tenants/nestle-fmcg-demo/exceptions?limit=50
        │
        ▼
Vite proxy (port 4028) → forwards to FastAPI backend (port 8000)
        │
        ▼
FastAPI route (routes/exceptions.py) → calls m5_data.get_exceptions()
        │
        ▼
m5_data.py reads from EXCEPTIONS_STORE (data loaded from M5 dataset on startup)
        │
        ▼
Response goes back: JSON list of exceptions
        │
        ▼
Frontend receives data → React re-renders the page → you see the exception cards
```

When you click **Resolve**:
```
You click "Resolve" → modal opens → you type a note → click "Resolve"
        │
        ▼
Frontend calls: PATCH /api/tenants/nestle-fmcg-demo/exceptions/exc-001
Body: {"action": "resolve", "note": "Fixed the data issue"}
        │
        ▼
Backend updates the exception status from "open" to "resolved"
        │
        ▼
Frontend re-fetches the exceptions list → the resolved exception is now hidden
```

---

## 5. Running the App

You need two terminal windows:

**Terminal 1 — Backend:**
```
cd D:\PROJECTS\DEMANDD\backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```
cd D:\PROJECTS\DEMANDD
npm run dev    (uses Next.js on port 4028)
```

Then open your browser to `http://localhost:4028`.

---

## 6. Tech Stack Cheat Sheet

| Layer | Technology | What it's for |
|---|---|---|
| Frontend framework | Next.js 15 | React framework for the browser UI |
| UI language | TypeScript | JavaScript with type safety |
| Styling | Tailwind CSS | Utility-first CSS framework |
| Charts | Recharts | React charting library |
| Icons | Lucide React | Clean SVG icons |
| Backend framework | FastAPI | Python web framework for APIs |
| Server | Uvicorn | ASGI server that runs FastAPI |
| Data validation | Pydantic v2 | Ensures data shapes are correct |
| Forecasting engine | statsmodels | Statistical models (Holt-Winters, ARIMA) |
| ML forecasting | LightGBM + Prophet | AI-powered forecasts |
| Math | NumPy + SciPy + scikit-learn | Scientific computing |

---

## 7. Important Numbers

- **117** = Number of products being forecast
- **274** = Weeks of historical sales data
- **52** = Weeks ahead we look for seasonal patterns
- **12** = Weeks we forecast into the future
- **8** = Number of external factors tracked
- **18** = Number of exception alerts generated on startup
- **4** = Number of phases in the user journey
- **21** = Number of backend API route files
- **19** = Number of frontend pages
- **0** = TypeScript compilation errors (the whole app is clean)
