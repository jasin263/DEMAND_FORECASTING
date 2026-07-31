// ===== ForecastIQ API Types =====

// --- KPI & Dashboard ---
export interface KPISummary {
  wape: number;
  wapeDelta: number;
  mape: number;
  mapeDelta: number;
  totalForecastedDemand: number;
  totalForecastedDemandDelta: number;
  exceptionSkus: number;
  exceptionSkusDelta: number;
  forecastBias: number;
  serviceLevel: number;
  serviceLevelDelta: number;
}

export interface ForecastDataPoint {
  week: string;
  actual: number | null;
  p50: number;
  p10: number;
  p90: number;
}

export interface AccuracyByCategory {
  category: string;
  mape: number;
  skus: number;
}

// --- Exceptions & Alerts ---
export type ExceptionType = 'high-mape' | 'stockout-risk' | 'demand-spike';

export interface ExceptionItem {
  id: string;
  sku: string;
  skuId: string;
  name: string;
  type: ExceptionType;
  mape?: number;
  daysToStockout?: number;
  spikeMultiple?: number;
  severity?: 'High' | 'Medium' | 'Low';
  timestamp?: string;
}

// --- SKU Management ---
export type DemandPattern = 'Smooth' | 'Seasonal' | 'Intermittent' | 'Erratic';

export interface SKUItem {
  id: string;
  skuId: string;
  name: string;
  category: string;
  location: string;
  mape: number;
  bias: number;
  p50Forecast: number;
  reorderQty: number;
  safetyStock: number;
  model: string;
  pattern: DemandPattern;
  lastActual: number;
  trend: number[];
  fullTrend: number[];
}

export interface SKUForecast {
  p50: number[];
  p10: number[];
  p90: number[];
}

export interface SKUDetail extends SKUItem {
  backtestHistory: BacktestRun[];
  forecast?: SKUForecast;
}

export interface BacktestRun {
  run: string;
  mape: number;
  wape: number;
}

// --- Scenarios ---
export interface Scenario {
  id: string;
  title: string;
  detail: string;
  impact: string;
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
}

// --- Data Sources ---
export interface DataSource {
  id: string;
  name: string;
  status: 'Connected' | 'Syncing' | 'Error' | 'Disconnected';
  freshness: string;
  type: 'ERP' | 'POS' | 'Supplier' | 'API' | 'Manual';
  lastSync: string;
}

// --- Configuration ---
export type Granularity = 'daily' | 'weekly' | 'monthly';
export type AlgorithmMode = 'auto' | 'manual';
export type OutlierTreatment = 'none' | 'winsorize' | 'remove';
export type SeasonalityMode = 'auto' | 'weekly' | 'monthly' | 'yearly' | 'none';
export type RetrainingFrequency = 'weekly' | 'biweekly' | 'monthly';
export type HierarchicalReconciliation = 'none' | 'bottom-up' | 'top-down' | 'middle-out';
export type AccuracyMetric = 'mape' | 'wape' | 'mase' | 'bias';
export type ReorderFormula = 'fixed' | 'dynamic' | 'safety-stock';
export type NotificationChannel = 'email' | 'slack' | 'webhook' | 'none';

export interface AppConfig {
  // Data & Granularity
  granularity: Granularity;
  forecastHorizon: number;
  historyWindow: number;
  aggregationHierarchy: string;
  // Business Context
  industryTemplate: string;
  defaultLeadTime: number;
  shelfLifeDays: number;
  moq: number;
  serviceLevelTarget: number;
  holidays: string[];
  promoCalendarEnabled: boolean;
  // Modeling
  algorithmMode: AlgorithmMode;
  selectedAlgorithm: string;
  intermittentRouting: boolean;
  outlierTreatment: OutlierTreatment;
  seasonalityMode: SeasonalityMode;
  externalRegressors: boolean;
  backtestingWindow: number;
  retrainingFrequency: RetrainingFrequency;
  predictionIntervals: boolean;
  hierarchicalReconciliation: HierarchicalReconciliation;
  // Output & Alerting
  accuracyMetric: AccuracyMetric;
  exceptionThreshold: number;
  reorderFormula: ReorderFormula;
  notificationChannel: NotificationChannel;
  notificationEmail: string;
}

// --- Model Analytics ---
export interface ModelMetric {
  label: string;
  value: string;
  delta: string;
  trend: 'positive' | 'negative' | 'neutral';
}

export interface ModelComparison {
  name: string;
  accuracy: number;
  bias: number;
  coverage: number;
  speed: string;
}

export interface ModelAnalytics {
  metrics: ModelMetric[];
  comparison: ModelComparison[];
}

export interface Integration {
  name: string;
  status: string;
  icon: string;
}

export interface BacktestResult {
  model: string;
  mape: number;
  wape: number;
  bias: number;
  coverage: number;
}

export interface BacktestRunDetail {
  lastRun: string;
  duration: string;
  skuCount: number;
  locations: number;
  results: BacktestResult[];
}

// --- Pagination ---
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// --- Onboarding / Wizard ---
export interface OnboardingState {
  workspaceName: string;
  industry: 'fmcg' | 'auto' | 'pharma' | 'custom';
  uploadedFile: File | null;
  columnMappings: Record<string, string>;
  config: {
    forecastHorizon: number;
    granularity: Granularity;
    algorithm: string;
    seasonality: boolean;
    intermittentHandling: boolean;
  };
}

// --- Export ---
export interface ExportPackage {
  id: string;
  name: string;
  format: 'CSV' | 'XLSX' | 'JSON';
  status: 'ready' | 'generating' | 'failed';
  updatedAt: string;
  size?: string;
}
