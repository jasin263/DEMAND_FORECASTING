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

export interface ExceptionItem {
  id: string;
  skuId: string;
  sku: string;
  name: string;
  description?: string;
  type?: string;
  mape?: number;
  daysToStockout?: number;
  spikeMultiple?: number;
  dropRatio?: number;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
  category?: string;
  location?: string;
  status?: string;
  note?: string;
  updatedAt?: string;
}

export interface SKUForecastItem {
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
  pattern: string;
  lastActual: number;
  trend: number[];
  fullTrend: number[];
}

export interface SKUForecast {
  p50: number[];
  p10: number[];
  p90: number[];
}

export interface SKUDetail {
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
  pattern: string;
  lastActual: number;
  trend: number[];
  fullTrend: number[];
  forecast?: SKUForecast;
  backtestHistory: { run: string; mape: number; wape: number }[];
}

export interface Scenario {
  id: string;
  title: string;
  detail: string;
  impact: string;
  status: string;
  createdAt?: string;
}

export interface DataSource {
  id: string;
  name: string;
  status: string;
  freshness: string;
  type: string;
  lastSync: string;
}

export type Granularity = 'daily' | 'weekly' | 'monthly';
export type AlgorithmMode = 'auto' | 'manual';
export type OutlierTreatment = 'none' | 'winsorize' | 'remove';
export type SeasonalityMode = 'auto' | 'weekly' | 'monthly' | 'yearly' | 'none';
export type RetrainingFrequency = 'weekly' | 'biweekly' | 'monthly';
export type HierarchicalReconciliation = 'none' | 'bottom-up' | 'top-down' | 'middle-out';
export type AccuracyMetric = 'wape' | 'mape' | 'mase' | 'bias';
export type ReorderFormula = 'fixed' | 'dynamic' | 'safety-stock';
export type NotificationChannel = 'email' | 'slack' | 'webhook' | 'none';

export interface AppConfig {
  granularity: Granularity;
  forecastHorizon: number;
  historyWindow: number;
  aggregationHierarchy: string;
  industryTemplate: string;
  defaultLeadTime: number;
  shelfLifeDays: number;
  moq: number;
  serviceLevelTarget: number;
  holidays: string[];
  promoCalendarEnabled: boolean;
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
  accuracyMetric: AccuracyMetric;
  exceptionThreshold: number;
  reorderFormula: ReorderFormula;
  notificationChannel: NotificationChannel;
  notificationEmail: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface OnboardingState {
  workspaceName: string;
  industry: 'fmcg' | 'auto' | 'pharma' | 'custom';
  uploadedFile: File | null;
  columnMappings: Record<string, string>;
  config: {
    forecastHorizon: number;
    granularity: 'daily' | 'weekly' | 'monthly';
    algorithm: string;
    seasonality: boolean;
    intermittentHandling: boolean;
  };
}

export interface OnboardingConfig {
  workspaceId: string;
  status: 'created' | 'error';
  message?: string;
}

export interface ExportPackage {
  id: string;
  name: string;
  format: 'CSV' | 'XLSX' | 'JSON';
  status: 'ready' | 'generating' | 'failed';
  updatedAt: string;
  size?: string;
}

export interface Integration {
  name: string;
  status: string;
  icon: string;
}

export interface AccuracyTrendPoint {
  date: string;
  wape: number;
  mape: number;
  bias: number;
  serviceLevel: number;
  skuCount: number;
}

export interface AccuracyDriftReport {
  trend: AccuracyTrendPoint[];
  currentWape: number;
  currentMape: number;
  driftWape: number;
  driftMape: number;
  degradation: 'stable' | 'degrading' | 'improving';
  lastUpdated: string;
}

export interface HierarchyNode {
  id: string;
  name: string;
  type: 'category' | 'location' | 'sku';
  children?: HierarchyNode[];
  mape?: number;
  wape?: number;
  p50Forecast?: number;
  p10Forecast?: number;
  p90Forecast?: number;
}

export interface HierarchyOverview {
  nodes: HierarchyNode[];
  reconciliationMethod: string;
  lastReconciled: string;
}

export interface ExceptionActionRequest {
  action: 'resolve' | 'acknowledge' | 'dismiss';
  note?: string;
}

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

// === 1. Walk-Forward Backtesting ===
export interface BacktestFold {
  fold: number;
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
  mape: number;
  wape: number;
  bias: number;
  coverage: number;
}

export interface WalkForwardResult {
  skuId: string;
  skuName: string;
  folds: BacktestFold[];
  avgMape: number;
  avgWape: number;
  avgBias: number;
  avgCoverage: number;
  stabilityScore: number;
}

export interface WalkForwardReport {
  results: WalkForwardResult[];
  horizon: number;
  nSplits: number;
  method: string;
  generatedAt: string;
}

// === 2. Seasonality Decomposition ===
export interface DecompositionComponent {
  week: string;
  trend: number;
  seasonal: number;
  residual: number;
  actual: number;
}

export interface SKUDecomposition {
  skuId: string;
  skuName: string;
  category: string;
  components: DecompositionComponent[];
  seasonalStrength: number;
  dominantPeriod: number;
  trendDirection: 'up' | 'down' | 'flat';
}

export interface DecompositionSummary {
  skus: SKUDecomposition[];
  method: string;
  period: number;
}

// === 3. What-If Simulations ===
export interface SimulationPreset {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, number | boolean | string>;
}

export interface SimulationParamDef {
  name: string;
  type: 'percent' | 'absolute' | 'toggle' | 'select';
  default: number | boolean | string;
  min?: number;
  max?: number;
  options?: string[];
}

export interface SimulationNode {
  week: string;
  baseline: number;
  simulated: number;
}

export interface SimulationResult {
  id: string;
  name: string;
  description?: string;
  status: 'running' | 'completed' | 'failed';
  created: string;
  completed?: string;
  impact: { totalBaseline: number; totalSimulated: number; impactPct: number; skuCount: number };
  series: SimulationNode[];
  parameters: Record<string, number | boolean | string>;
}

// === 4. Demand Sensing ===
export interface DemandSignal {
  date: string;
  pos: number | null;
  sellIn: number | null;
  sellOut: number | null;
  storeStock: number | null;
  warehouseStock: number | null;
  blended: number | null;
}

export interface SensingConfig {
  posWeight: number;
  sellInWeight: number;
  sellOutWeight: number;
  smoothingWindow: number;
  outlierThreshold: number;
}

export interface SensingResult {
  skuId: string;
  skuName: string;
  signals: DemandSignal[];
  config: SensingConfig;
  blendedMape: number | null;
  lastUpdated: string;
}

export interface DemandSensingSummary {
  results: SensingResult[];
  globalConfig: SensingConfig;
  overallMape: number | null;
}

// === 5. Inventory Optimization ===
export interface InventoryRecommendation {
  skuId: string;
  skuName: string;
  category: string;
  reorderPoint: number;
  safetyStock: number;
  economicOrderQty: number;
  targetStock: number;
  avgDemandPerDay: number;
  demandStd: number;
  leadTimeDays: number;
  serviceLevel: number;
  projectedFillRate: number;
  stockoutProbability: number;
  annualHoldingCost: number;
}

export interface InventorySummary {
  skus: InventoryRecommendation[];
  totalSafetyStock: number;
  avgServiceLevel: number;
  totalAnnualHoldingCost: number;
}

// === 6. External Factors ===
export interface ExternalFactorSeries {
  date: string;
  value: number;
}

export interface ExternalFactor {
  id: string;
  name: string;
  type: 'weather' | 'macroeconomic' | 'competitive' | 'calendar' | 'custom';
  description: string;
  data: ExternalFactorSeries[];
  correlation: number | null;
  lagDetected: number | null;
  enabled: boolean;
}

export interface SKUFactorCorrelation {
  skuId: string;
  skuName: string;
  correlations: { factorId: string; factorName: string; correlation: number; lag: number }[];
}

export interface ExternalFactorSummary {
  factors: ExternalFactor[];
  skuCorrelations?: SKUFactorCorrelation[];
  lastSynced: string;
}

// === 7. Collaboration ===
export interface ForecastAnnotation {
  id: string;
  skuId: string;
  week: string;
  author: string;
  role: string;
  text: string;
  type: 'comment' | 'override' | 'adjustment';
  originalValue?: number;
  adjustedValue?: number;
  createdAt: string;
  updatedAt: string;
  resolved: boolean;
}

export interface ForecastOverride {
  id: string;
  skuId: string;
  week: string;
  author: string;
  role: string;
  reason: string;
  originalP50: number;
  adjustedP50: number;
  originalP10: number;
  originalP90: number;
  adjustedP10: number;
  adjustedP90: number;
  createdAt: string;
  approved: boolean | null;
}

export interface CollaborationThread {
  id: string;
  skuId: string;
  subject: string;
  messages: ForecastAnnotation[];
  status: 'open' | 'resolved';
  createdAt: string;
}

export interface CollaborationSummary {
  annotations: ForecastAnnotation[];
  overrides: ForecastOverride[];
  threads: CollaborationThread[];
  pendingApprovals: number;
}

// === 8. Consensus / Blended Forecast ===
export interface ConsensusMethodology {
  id: string;
  name: string;
  description: string;
}

export interface BlendedForecastPoint {
  week: string;
  mlForecast: number | null;
  statisticalForecast: number | null;
  judgmentalForecast: number | null;
  blendedP50: number;
  blendedP10: number;
  blendedP90: number;
  weights: Record<string, number>;
}

export interface ConsensusConfig {
  mlWeight: number;
  statisticalWeight: number;
  judgmentalWeight: number;
  adaptiveWeighting: boolean;
  minHistory: number;
}

export interface ConsensusResult {
  skuId: string;
  skuName: string;
  config: ConsensusConfig;
  forecasts: BlendedForecastPoint[];
  effectiveWeights: Record<string, number>;
  blendedMape: number | null;
  mlMape: number | null;
  statMape: number | null;
}

export interface ConsensusSummary {
  results: ConsensusResult[];
  methodologies: ConsensusMethodology[];
  globalConfig: ConsensusConfig;
  overallBlendedMape: number | null;
}

// --- Data & Analytics Maturity ---

export interface MaturityDimension {
  id: string;
  name: string;
  importance: 'essential' | 'important' | 'nice';
  description: string;
  score: number;
  status: 'complete' | 'partial' | 'missing';
  evidence: string;
  note?: string;
}

export interface DatasetSummary {
  filename?: string;
  columns?: string[];
  rows?: number;
  granularity?: string;
  nWeeks?: number;
  entities?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface DataMaturitySummary {
  overallScore: number;
  level: string;
  levels: string[];
  dimensions: MaturityDimension[];
  summary: string;
  datasetSummary: DatasetSummary;
}

export interface MissingData {
  dimension: string;
  name: string;
}

export interface AnalyticsCapability {
  id: string;
  name: string;
  description: string;
  value: string;
  status: 'ready' | 'partial' | 'blocked';
  score: number;
  missingData: MissingData[];
}

export interface MaturityRecommendation {
  id: string;
  priority: 'P1' | 'P2' | 'P3';
  title: string;
  action: string;
  example?: string;
  dimension: string;
  dimensionName: string;
  unlocks: string;
  impact: string;
  effort: 'Low' | 'Medium' | 'High';
}

export interface AnalyticsMaturitySummary {
  overallScore: number;
  level: string;
  capabilities: AnalyticsCapability[];
  recommendations: MaturityRecommendation[];
  summary: string;
  counts: { ready: number; partial: number; blocked: number };
}
