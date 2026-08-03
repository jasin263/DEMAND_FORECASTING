"""Pydantic models matching the TypeScript types from src/lib/api-types.ts"""
from pydantic import BaseModel
from typing import Optional, Literal, TypeVar, Generic
from enum import Enum

T = TypeVar('T')


# --- KPI & Dashboard ---
class KPISummary(BaseModel):
    wape: float
    wapeDelta: Optional[float] = None
    mape: float
    mapeDelta: Optional[float] = None
    totalForecastedDemand: float
    totalForecastedDemandDelta: Optional[float] = None
    exceptionSkus: int
    exceptionSkusDelta: Optional[int] = None
    forecastBias: float
    serviceLevel: float
    serviceLevelDelta: Optional[float] = None


class ForecastDataPoint(BaseModel):
    week: str
    actual: Optional[float] = None
    p50: float
    p10: float
    p90: float


class AccuracyByCategory(BaseModel):
    category: str
    mape: float
    skus: int


# --- Exceptions & Alerts ---
ExceptionType = Literal['high-mape', 'stockout-risk', 'demand-spike', 'demand-drop']
ExceptionStatus = Literal['open', 'acknowledged', 'resolved', 'dismissed']


class ExceptionItem(BaseModel):
    id: str
    sku: Optional[str] = None
    skuId: str
    name: str
    type: ExceptionType
    mape: Optional[float] = None
    daysToStockout: Optional[int] = None
    spikeMultiple: Optional[float] = None
    dropRatio: Optional[float] = None
    severity: Optional[Literal['high', 'medium', 'low']] = None
    timestamp: Optional[str] = None
    status: Optional[ExceptionStatus] = 'open'
    note: Optional[str] = None
    updatedAt: Optional[str] = None


class ExceptionActionRequest(BaseModel):
    action: Literal['resolve', 'acknowledge', 'dismiss']
    note: Optional[str] = None


# --- SKU Management ---
DemandPattern = Literal['Smooth', 'Seasonal', 'Intermittent', 'Erratic']


class SKUItem(BaseModel):
    id: str
    skuId: str
    name: str
    category: str
    location: str
    mape: float
    bias: float
    p50Forecast: float
    reorderQty: float
    safetyStock: float
    model: str
    pattern: DemandPattern
    lastActual: float
    trend: list[float]
    fullTrend: list[float]
    sellPrice: Optional[float] = None
    priceHistory: Optional[list[float]] = None
    events: Optional[list[list[str]]] = None
    promotionWeeks: Optional[int] = None


class BacktestRun(BaseModel):
    run: str
    mape: float
    wape: float


class SKUDetail(SKUItem):
    backtestHistory: list[BacktestRun]
    forecast: Optional['SKUForecast'] = None
    sellPrice: Optional[float] = None
    priceHistory: Optional[list[float]] = None
    events: Optional[list[list[str]]] = None


# --- Accuracy Monitoring ---
class AccuracyTrendPoint(BaseModel):
    date: str
    wape: float
    mape: float
    bias: float
    serviceLevel: float
    skuCount: int


class AccuracyDriftReport(BaseModel):
    trend: list[AccuracyTrendPoint]
    currentWape: float
    currentMape: float
    driftWape: float
    driftMape: float
    degradation: Literal['stable', 'degrading', 'improving']
    lastUpdated: str


# --- Hierarchical Reconciliation ---
class HierarchyNode(BaseModel):
    id: str
    name: str
    type: Literal['category', 'location', 'sku']
    children: Optional[list['HierarchyNode']] = None
    mape: Optional[float] = None
    wape: Optional[float] = None
    p50Forecast: Optional[float] = None
    p10Forecast: Optional[float] = None
    p90Forecast: Optional[float] = None


class HierarchyOverview(BaseModel):
    nodes: list[HierarchyNode]
    reconciliationMethod: str
    lastReconciled: str


# --- Scenarios ---
class Scenario(BaseModel):
    id: str
    title: str
    detail: str
    impact: str
    status: Literal['draft', 'active', 'archived']
    createdAt: str


# --- Data Sources ---
class DataSource(BaseModel):
    id: str
    name: str
    status: Literal['Connected', 'Syncing', 'Error', 'Disconnected']
    freshness: str
    type: Literal['ERP', 'POS', 'Supplier', 'API', 'Manual']
    lastSync: str


# --- Configuration ---
Granularity = Literal['daily', 'weekly', 'monthly']
AlgorithmMode = Literal['auto', 'manual']
OutlierTreatment = Literal['none', 'winsorize', 'remove']
SeasonalityMode = Literal['auto', 'weekly', 'monthly', 'yearly', 'none']
RetrainingFrequency = Literal['weekly', 'biweekly', 'monthly']
HierarchicalReconciliation = Literal['none', 'bottom-up', 'top-down', 'middle-out']
AccuracyMetric = Literal['mape', 'wape', 'mase', 'bias']
ReorderFormula = Literal['fixed', 'dynamic', 'safety-stock']
NotificationChannel = Literal['email', 'slack', 'webhook', 'none']


class AppConfig(BaseModel):
    # Data & Granularity
    granularity: Granularity = 'weekly'
    forecastHorizon: int = 12
    historyWindow: int = 104
    aggregationHierarchy: str = 'sku-location'
    # Business Context
    industryTemplate: str = 'fmcg'
    defaultLeadTime: int = 14
    shelfLifeDays: int = 90
    moq: int = 50
    serviceLevelTarget: float = 97.5
    holidays: list[str] = ['2026-01-26', '2026-08-15', '2026-10-02']
    promoCalendarEnabled: bool = True
    # Modeling
    algorithmMode: AlgorithmMode = 'auto'
    selectedAlgorithm: str = 'prophet'
    intermittentRouting: bool = False
    outlierTreatment: OutlierTreatment = 'winsorize'
    seasonalityMode: SeasonalityMode = 'auto'
    externalRegressors: bool = True
    backtestingWindow: int = 8
    retrainingFrequency: RetrainingFrequency = 'weekly'
    predictionIntervals: bool = True
    hierarchicalReconciliation: HierarchicalReconciliation = 'bottom-up'
    # Output & Alerting
    accuracyMetric: AccuracyMetric = 'wape'
    exceptionThreshold: int = 25
    wapeTarget: float = 15.0
    reorderFormula: ReorderFormula = 'dynamic'
    notificationChannel: NotificationChannel = 'email'
    notificationEmail: str = 'anika.patel@nestle-india.com'


# --- Pagination ---
class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    pageSize: int
    totalPages: int


# --- Export Packages ---
class ExportPackage(BaseModel):
    id: str
    name: str
    format: Literal['CSV', 'XLSX', 'JSON']
    status: Literal['ready', 'generating', 'failed']
    updatedAt: str
    size: str


class Integration(BaseModel):
    name: str
    status: str
    icon: str


class ExportPackagesResponse(BaseModel):
    packages: list[ExportPackage]
    integrations: list[Integration]


# --- Model Analytics ---
class ModelMetric(BaseModel):
    label: str
    value: str
    delta: str
    trend: Literal['positive', 'negative', 'neutral']


class SKUForecast(BaseModel):
    p50: list[float]
    p10: list[float]
    p90: list[float]


class ModelComparison(BaseModel):
    name: str
    accuracy: float
    bias: float
    coverage: float
    speed: str


class ModelAnalytics(BaseModel):
    metrics: list[ModelMetric]
    comparison: list[ModelComparison]


# --- Backtest Results ---
class BacktestResult(BaseModel):
    lastRun: str
    duration: str
    skuCount: int
    locations: int
    results: list[dict]


# --- Data Source Create ---
class DataSourceCreate(BaseModel):
    name: str
    type: Literal['ERP', 'POS', 'Supplier', 'API', 'Manual']


# --- 1. Statistical Backtesting (Walk-Forward) ---
class BacktestFold(BaseModel):
    fold: int
    trainStart: str
    trainEnd: str
    testStart: str
    testEnd: str
    mape: float
    wape: float
    bias: float
    coverage: float

class WalkForwardResult(BaseModel):
    skuId: str
    skuName: str
    folds: list[BacktestFold]
    avgMape: float
    avgWape: float
    avgBias: float
    avgCoverage: float
    stabilityScore: float  # lower std = more stable

class WalkForwardReport(BaseModel):
    results: list[WalkForwardResult]
    horizon: int
    nSplits: int
    method: str
    generatedAt: str


# --- 2. Seasonality Decomposition ---
class DecompositionComponent(BaseModel):
    week: str
    trend: float
    seasonal: float
    residual: float
    actual: float

class SKUDecomposition(BaseModel):
    skuId: str
    skuName: str
    category: str
    components: list[DecompositionComponent]
    seasonalStrength: float  # 0-1, how strong seasonality is
    dominantPeriod: int  # detected dominant period in weeks
    trendDirection: Literal['up', 'down', 'flat']

class DecompositionSummary(BaseModel):
    skus: list[SKUDecomposition]
    method: str
    period: int


# --- 3. What-If Simulation Engine ---
class SimulationParameter(BaseModel):
    name: str
    type: Literal['percent', 'absolute', 'toggle', 'select']
    default: float | bool | str
    min: Optional[float] = None
    max: Optional[float] = None
    options: Optional[list[str]] = None

class SimulationPreset(BaseModel):
    id: str
    name: str
    description: str
    parameters: dict[str, float | bool | str]

class SimulationInput(BaseModel):
    name: str
    description: Optional[str] = None
    skuIds: Optional[list[str]] = None
    parameters: dict[str, float | bool | str]

class SimulationNode(BaseModel):
    week: str
    baseline: float
    simulated: float

class SimulationResult(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    status: Literal['running', 'completed', 'failed']
    created: str
    completed: Optional[str] = None
    impact: dict  # aggregated impact stats
    series: list[SimulationNode]
    skuResults: Optional[list[WalkForwardResult]] = None
    parameters: dict

class SimulationList(BaseModel):
    simulations: list[SimulationResult]
    presets: list[SimulationPreset]
    availableParams: list[SimulationParameter]


# --- 4. Demand Sensing (Short-Term Signal Blending) ---
class DemandSignal(BaseModel):
    date: str
    pos: Optional[float] = None
    sellIn: Optional[float] = None
    sellOut: Optional[float] = None
    storeStock: Optional[float] = None
    warehouseStock: Optional[float] = None
    blended: Optional[float] = None

class SensingConfig(BaseModel):
    posWeight: float = 0.5
    sellInWeight: float = 0.3
    sellOutWeight: float = 0.2
    smoothingWindow: int = 4
    outlierThreshold: float = 2.5

class SensingResult(BaseModel):
    skuId: str
    skuName: str
    signals: list[DemandSignal]
    config: SensingConfig
    blendedMape: Optional[float] = None
    lastUpdated: str

class DemandSensingSummary(BaseModel):
    results: list[SensingResult]
    globalConfig: SensingConfig
    overallMape: Optional[float] = None


# --- 5. Inventory Optimization ---
class InventoryPolicy(BaseModel):
    skuId: str
    skuName: str
    leadTimeDays: int = 14
    leadTimeStd: float = 3.0
    serviceLevel: float = 0.975
    holdingCostPercent: float = 0.25
    orderCost: float = 50.0
    moq: int = 0

class InventoryRecommendation(BaseModel):
    skuId: str
    skuName: str
    category: str
    reorderPoint: float
    safetyStock: float
    economicOrderQty: float
    targetStock: float
    avgDemandPerDay: float
    demandStd: float
    leadTimeDays: int
    serviceLevel: float
    projectedFillRate: float
    stockoutProbability: float
    annualHoldingCost: float

class InventorySummary(BaseModel):
    skus: list[InventoryRecommendation]
    totalSafetyStock: float
    avgServiceLevel: float
    totalAnnualHoldingCost: float


# --- 6. External Factor Modeling ---
class ExternalFactorSeries(BaseModel):
    date: str
    value: float

class ExternalFactor(BaseModel):
    id: str
    name: str
    type: Literal['weather', 'macroeconomic', 'competitive', 'calendar', 'custom']
    description: str
    data: list[ExternalFactorSeries]
    correlation: Optional[float] = None
    lagDetected: Optional[int] = None
    enabled: bool = True

class ExternalFactorCorrelation(BaseModel):
    skuId: str
    skuName: str
    correlations: list[dict]  # [{factorId, factorName, correlation, lag}]

class ExternalFactorSummary(BaseModel):
    factors: list[ExternalFactor]
    skuCorrelations: Optional[list[ExternalFactorCorrelation]] = None
    lastSynced: str


# --- 7. Collaboration Layer ---
class ForecastAnnotation(BaseModel):
    id: str
    skuId: str
    week: str
    author: str
    role: str
    text: str
    type: Literal['comment', 'override', 'adjustment']
    originalValue: Optional[float] = None
    adjustedValue: Optional[float] = None
    createdAt: str
    updatedAt: str
    resolved: bool = False

class ForecastOverride(BaseModel):
    id: str
    skuId: str
    week: str
    author: str
    role: str
    reason: str
    originalP50: float
    adjustedP50: float
    originalP10: float
    originalP90: float
    adjustedP10: float
    adjustedP90: float
    createdAt: str
    approved: Optional[bool] = None

class CollaborationThread(BaseModel):
    id: str
    skuId: str
    subject: str
    messages: list[ForecastAnnotation]
    status: Literal['open', 'resolved']
    createdAt: str

class CollaborationSummary(BaseModel):
    annotations: list[ForecastAnnotation]
    overrides: list[ForecastOverride]
    threads: list[CollaborationThread]
    pendingApprovals: int


# --- 8. Consensus / Blended Forecast ---
class ConsensusMethodology(BaseModel):
    id: str
    name: str
    description: str

class BlendedForecastPoint(BaseModel):
    week: str
    mlForecast: Optional[float] = None
    statisticalForecast: Optional[float] = None
    judgmentalForecast: Optional[float] = None
    blendedP50: float
    blendedP10: float
    blendedP90: float
    weights: dict[str, float] = {}

class ConsensusConfig(BaseModel):
    mlWeight: float = 0.5
    statisticalWeight: float = 0.3
    judgmentalWeight: float = 0.2
    adaptiveWeighting: bool = True
    minHistory: int = 12

class ConsensusResult(BaseModel):
    skuId: str
    skuName: str
    config: ConsensusConfig
    forecasts: list[BlendedForecastPoint]
    effectiveWeights: dict[str, float]
    blendedMape: Optional[float] = None
    mlMape: Optional[float] = None
    statMape: Optional[float] = None

class ConsensusSummary(BaseModel):
    results: list[ConsensusResult]
    methodologies: list[ConsensusMethodology]
    globalConfig: ConsensusConfig
    overallBlendedMape: Optional[float] = None

