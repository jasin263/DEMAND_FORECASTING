import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useConfiguration, useSaveConfiguration, useRerunForecast } from '../lib/api-hooks';
import { Save, RotateCcw, Database, Briefcase, Cpu, Bell, Loader2, Plus, Play, Info, CalendarDays, Layers, Target, BellRing, FlaskConical, Sparkles, Gauge } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import FeaturePageShell from '../components/FeaturePageShell';
import type { AppConfig } from '../lib/api-types';

const tabs = [
  { id: 'data', label: 'Data & Granularity', icon: <Database size={15} /> },
  { id: 'business', label: 'Business Context', icon: <Briefcase size={15} /> },
  { id: 'modeling', label: 'Modeling', icon: <Cpu size={15} /> },
  { id: 'output', label: 'Output & Alerting', icon: <Bell size={15} /> },
];

const Tooltip = ({ text }: { text: string }) => (
  <span title={text} className="inline-flex ml-1 cursor-help">
    <Info size={12} className="text-muted-foreground hover:text-foreground" />
  </span>
);

function SectionCard({ icon, title, description, children }: { icon: React.ReactNode; title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          {icon}
        </span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {description && <p className="text-xs text-muted-foreground mb-4 mt-1">{description}</p>}
      {!description && <div className="mb-4" />}
      {children}
    </div>
  );
}

function Field({ label, hint, description, children, disabled }: { label: string; hint?: string; description?: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <div className={disabled ? 'opacity-45 pointer-events-none' : ''}>
      <div className="flex items-center">
        <label className="label-text mb-0.5">{label}</label>
        {hint && <Tooltip text={hint} />}
      </div>
      {description && <p className="text-xs text-muted-foreground mb-2">{description}</p>}
      {children}
    </div>
  );
}

const defaultConfig: AppConfig = {
  granularity: 'weekly',
  forecastHorizon: 12,
  historyWindow: 104,
  aggregationHierarchy: 'sku-location',
  industryTemplate: 'fmcg',
  defaultLeadTime: 14,
  shelfLifeDays: 90,
  moq: 50,
  serviceLevelTarget: 97.5,
  holidays: ['2026-01-26', '2026-08-15', '2026-10-02'],
  promoCalendarEnabled: true,
  algorithmMode: 'auto',
  selectedAlgorithm: 'lightgbm',
  intermittentRouting: false,
  outlierTreatment: 'winsorize',
  seasonalityMode: 'auto',
  externalRegressors: true,
  backtestingWindow: 8,
  retrainingFrequency: 'weekly',
  predictionIntervals: true,
  hierarchicalReconciliation: 'bottom-up',
  accuracyMetric: 'wape',
  exceptionThreshold: 25,
  reorderFormula: 'dynamic',
  notificationChannel: 'email',
  notificationEmail: 'anika.patel@nestle-india.com',
};

export default function ConfigurationPanelPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('data');
  const [hasChanges, setHasChanges] = useState(false);
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [workspaceContext, setWorkspaceContext] = useState<{ workspaceName: string; industry: string; fileName?: string; mapping?: Record<string, unknown>; forecastHorizon?: number; granularity?: string; algorithm?: string } | null>(null);
  const [forecastRunning, setForecastRunning] = useState(false);
  
  const { data: configData, loading, error, refetch } = useConfiguration();
  const { execute: saveConfig, loading: saving, error: saveError } = useSaveConfiguration();
  const { execute: rerunForecast, loading: running } = useRerunForecast();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('forecastiq.lastForecastRun');
      if (stored) {
        const parsed = JSON.parse(stored);
        setWorkspaceContext({
          workspaceName: parsed.workspaceName || 'Untitled workspace',
          industry: parsed.industry || 'custom',
          fileName: parsed.fileName,
          mapping: parsed.mapping,
          forecastHorizon: parsed.config?.forecastHorizon || 12,
          granularity: parsed.config?.granularity || 'weekly',
          algorithm: parsed.config?.algorithm || 'auto',
        });
      }
    } catch {
      setWorkspaceContext(null);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (configData && !hasChanges) {
      const mergedConfig = {
        ...configData,
        industryTemplate: workspaceContext?.industry || configData.industryTemplate || 'custom',
        forecastHorizon: workspaceContext?.forecastHorizon || configData.forecastHorizon || defaultConfig.forecastHorizon,
        granularity: (workspaceContext?.granularity as AppConfig['granularity']) || configData.granularity || defaultConfig.granularity,
        selectedAlgorithm: workspaceContext?.algorithm || configData.selectedAlgorithm || defaultConfig.selectedAlgorithm,
      };
      setConfig(mergedConfig);
    }
  }, [configData, hasChanges, workspaceContext]);

  const updateConfig = (partial: Partial<AppConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await saveConfig(config);
      setHasChanges(false);
      toast.success('Configuration saved. Recomputing forecasts…', { duration: 3000 });
    } catch (err) {
      toast.error(saveError || 'Failed to save configuration', { duration: 3000 });
    }
  };

  const handleRunForecast = async () => {
    if (hasChanges) {
      try { await saveConfig(config); setHasChanges(false); } catch {}
    }
    setForecastRunning(true);
    try {
      await rerunForecast();
      navigate('/dashboard');
    } catch (err) {
      setForecastRunning(false);
      toast.error('Forecast run failed. Check backend connection and try again.', { duration: 8000 });
    }
  };

  const handleReset = () => {
    setConfig(defaultConfig);
    setHasChanges(false);
    toast.info('Configuration reset to defaults.', { duration: 2000 });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <FeaturePageShell
        title="Configuration Panel"
        description="Tenant: Nestle FMCG Demo · All changes apply on next forecast run"
        badge="Error loading"
      >
        <div className="rounded-2xl border border-negative/30 bg-negative/5 p-6 text-center">
          <p className="text-sm text-negative font-medium">Failed to load configuration</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
          <button onClick={refetch} className="btn-secondary text-xs mt-3 py-1.5">Retry</button>
        </div>
      </FeaturePageShell>
    );
  }

  return (
    <React.Fragment>
      {forecastRunning && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
          <Loader2 size={48} className="animate-spin text-primary" />
          <p className="text-lg font-semibold text-foreground">Running Forecast Engine</p>
          <p className="text-sm text-muted-foreground">Processing your dataset with ML models…</p>
        </div>
      )}
      <FeaturePageShell
        title="Configuration Panel"
        description="Tenant: Nestle FMCG Demo · All changes apply on next forecast run"
        actions={
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="status-badge bg-warning/10 text-warning border border-warning/20 text-xs animate-fade-in">
                Unsaved changes
              </span>
            )}
            <button onClick={handleReset} className="btn-secondary text-xs py-1.5">
              <RotateCcw size={13} />
              Reset to defaults
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="btn-secondary text-xs py-1.5 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save size={13} />
                  Save Configuration
                </>
              )}
            </button>
            <button
              onClick={handleRunForecast}
              disabled={running}
              className="btn-primary text-xs py-1.5 disabled:opacity-50"
            >
              {running ? (
                <><Loader2 size={13} className="animate-spin" /> Running…</>
              ) : (
                <><Play size={13} /> Run Forecast</>
              )}
            </button>
          </div>
        }
      >
        <Toaster position="bottom-right" theme="dark" />

        {workspaceContext && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 mb-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Workspace ready for tuning</p>
                <p className="text-xs text-muted-foreground">
                  {workspaceContext.workspaceName} · {workspaceContext.industry} · {workspaceContext.fileName || 'dataset uploaded'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded-full border border-border bg-background/70 px-2 py-1">Horizon: {workspaceContext.forecastHorizon || defaultConfig.forecastHorizon}</span>
                  <span className="rounded-full border border-border bg-background/70 px-2 py-1">Granularity: {workspaceContext.granularity || defaultConfig.granularity}</span>
                  <span className="rounded-full border border-border bg-background/70 px-2 py-1">Algorithm: {workspaceContext.algorithm || 'auto'}</span>
                </div>
              </div>
              {workspaceContext.mapping && (
                <div className="text-xs text-muted-foreground">
                  Target: <span className="font-medium text-foreground">{String(workspaceContext.mapping.target_column || '—')}</span> · Date: <span className="font-medium text-foreground">{String(workspaceContext.mapping.date_column || '—')}</span> · Entity: <span className="font-medium text-foreground">{String(workspaceContext.mapping.entity_column || '—')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          <div className="xl:col-span-2 2xl:col-span-3 space-y-4">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
              {tabs.map((tab) => (
                <button
                  key={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="animate-fade-in space-y-4">
              {activeTab === 'data' && <TabDataGranularity config={config} onUpdate={updateConfig} />}
              {activeTab === 'business' && <TabBusinessContext config={config} onUpdate={updateConfig} />}
              {activeTab === 'modeling' && <TabModeling config={config} onUpdate={updateConfig} />}
              {activeTab === 'output' && <TabOutputAlerting config={config} onUpdate={updateConfig} />}
            </div>
          </div>

          <div className="xl:col-span-1 2xl:col-span-1">
            <JsonPreviewPanel config={config} />
          </div>
        </div>
      </FeaturePageShell>
    </React.Fragment>
  );
}

function TabDataGranularity({ config, onUpdate }: { config: AppConfig; onUpdate: (partial: Partial<AppConfig>) => void }) {
  return (
    <div className="space-y-4">
      <SectionCard
        icon={<CalendarDays size={15} />}
        title="Time Settings"
        description="How demand is aggregated and how far the forecast looks ahead."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field
            label="Time Granularity"
            hint="The aggregation level for forecasting. Must match your data's natural frequency."
            description="Determines how demand records are aggregated before modeling"
          >
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((g) => (
                <button
                  key={`gran-${g}`}
                  type="button"
                  onClick={() => onUpdate({ granularity: g })}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all duration-150 ${
                    config.granularity === g
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40'
                  }`}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </Field>

          <Field
            label={`Forecast Horizon (${config.granularity === 'daily' ? 'days' : config.granularity === 'weekly' ? 'weeks' : 'months'})`}
            hint="How far ahead to forecast. Longer horizons produce wider prediction intervals."
            description={`Current: ${config.forecastHorizon} ${config.granularity === 'daily' ? 'days' : config.granularity === 'weekly' ? 'weeks' : 'months'}`}
          >
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={config.granularity === 'daily' ? 7 : config.granularity === 'weekly' ? 4 : 1}
                max={config.granularity === 'daily' ? 90 : config.granularity === 'weekly' ? 52 : 24}
                step={config.granularity === 'daily' ? 7 : config.granularity === 'weekly' ? 4 : 1}
                value={config.forecastHorizon}
                onChange={(e) => onUpdate({ forecastHorizon: Number(e.target.value) })}
                className="flex-1 accent-primary"
              />
              <input
                type="number"
                value={config.forecastHorizon}
                onChange={(e) => onUpdate({ forecastHorizon: Math.max(1, Number(e.target.value)) })}
                className="input-field w-16 text-center text-sm py-1.5"
              />
            </div>
          </Field>

          <Field
            label="History Window (weeks)"
            hint="How many periods of history are used for model training. More history improves seasonal detection."
            description="Minimum recommended: 2× seasonal period + forecast horizon"
          >
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={26}
                max={260}
                step={26}
                value={config.historyWindow}
                onChange={(e) => onUpdate({ historyWindow: Number(e.target.value) })}
                className="flex-1 accent-primary"
              />
              <input
                type="number"
                value={config.historyWindow}
                onChange={(e) => onUpdate({ historyWindow: Math.max(26, Number(e.target.value)) })}
                className="input-field w-16 text-center text-sm py-1.5"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>26w (6 months)</span>
              <span>260w (5 years)</span>
            </div>
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        icon={<Layers size={15} />}
        title="Aggregation"
        description="Defines what constitutes one forecast series."
      >
        <Field
          label="Series Key"
          hint="The key combination used as the base forecasting unit"
          description="Choose the level at which demand is modeled and reported"
        >
          <select
            value={config.aggregationHierarchy}
            onChange={(e) => onUpdate({ aggregationHierarchy: e.target.value })}
            className="input-field text-sm"
          >
            <option value="sku">SKU only (aggregate all locations)</option>
            <option value="sku-location">SKU × Location (default)</option>
            <option value="sku-location-channel">SKU × Location × Channel</option>
            <option value="category-location">Category × Location (high-level)</option>
          </select>
        </Field>
      </SectionCard>

      <div className="glass-card p-4 bg-primary/3 border-primary/20">
        <h4 className="text-xs font-semibold text-primary mb-2">Configuration Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {[
            { label: 'Granularity', value: config.granularity },
            { label: 'Horizon', value: `${config.forecastHorizon} ${config.granularity === 'monthly' ? 'mo' : config.granularity === 'daily' ? 'd' : 'w'}` },
            { label: 'History', value: `${config.historyWindow}w` },
            { label: 'Hierarchy', value: config.aggregationHierarchy },
          ].map((item) => (
            <div key={`sum-${item.label}`}>
              <p className="text-muted-foreground">{item.label}</p>
              <p className="font-mono font-medium text-foreground mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabBusinessContext({ config, onUpdate }: { config: AppConfig; onUpdate: (partial: Partial<AppConfig>) => void }) {
  return (
    <div className="space-y-4">
      <SectionCard
        icon={<Briefcase size={15} />}
        title="Industry & Supply Chain"
        description="Planning parameters applied across all SKUs."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field
            label="Industry Template"
            hint="Pre-configured settings for your industry vertical"
          >
            <select
              value={config.industryTemplate}
              onChange={(e) => onUpdate({ industryTemplate: e.target.value })}
              className="input-field text-sm mt-1"
            >
              <option value="fmcg">FMCG (Fast-Moving Consumer Goods)</option>
              <option value="auto">Auto Parts</option>
              <option value="pharma">Pharmaceuticals</option>
              <option value="custom">Custom</option>
            </select>
          </Field>
          <Field
            label="Default Lead Time (days)"
            hint="Standard supplier lead time used for reorder calculations"
          >
            <input
              type="number"
              value={config.defaultLeadTime}
              onChange={(e) => onUpdate({ defaultLeadTime: Number(e.target.value) })}
              className="input-field text-sm mt-1"
            />
          </Field>
          <Field
            label="Shelf Life (days)"
            hint="Product shelf life for perishable goods planning"
          >
            <input
              type="number"
              value={config.shelfLifeDays}
              onChange={(e) => onUpdate({ shelfLifeDays: Number(e.target.value) })}
              className="input-field text-sm mt-1"
            />
          </Field>
          <Field
            label="MOQ (Minimum Order Quantity)"
            hint="Minimum order quantity enforced by suppliers"
          >
            <input
              type="number"
              value={config.moq}
              onChange={(e) => onUpdate({ moq: Number(e.target.value) })}
              className="input-field text-sm mt-1"
            />
          </Field>
          <Field
            label="Service Level Target (%)"
            hint="Target in-stock probability for safety stock calculations"
          >
            <input
              type="number"
              step="0.1"
              value={config.serviceLevelTarget}
              onChange={(e) => onUpdate({ serviceLevelTarget: Number(e.target.value) })}
              className="input-field text-sm mt-1"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        icon={<CalendarDays size={15} />}
        title="Calendar & Promotions"
        description="Holidays and promo events influence demand adjustments."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field
            label="Promo Calendar"
            hint="Include promotional events in forecast adjustments"
          >
            <div className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                checked={config.promoCalendarEnabled}
                onChange={(e) => onUpdate({ promoCalendarEnabled: e.target.checked })}
                className="rounded border-border text-primary focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">Include promotional uplifts in forecast</span>
            </div>
          </Field>
          <Field
            label="Holidays"
            hint="Dates with expected demand shifts (e.g., national holidays)"
            description="Holidays are treated as special events by the seasonality model"
          >
            <div className="space-y-2 mt-1">
              {config.holidays.map((holiday, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="date"
                    value={holiday}
                    onChange={(e) => {
                      const holidays = [...config.holidays];
                      holidays[idx] = e.target.value;
                      onUpdate({ holidays });
                    }}
                    className="input-field w-40"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const holidays = [...config.holidays];
                      holidays.splice(idx, 1);
                      onUpdate({ holidays });
                    }}
                    className="btn-ghost p-1.5 text-muted-foreground hover:text-negative"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const holidays = [...config.holidays];
                  holidays.push('2026-12-25');
                  onUpdate({ holidays });
                }}
                className="btn-secondary text-xs py-1.5 w-fit"
              >
                <Plus size={12} /> Add holiday
              </button>
            </div>
          </Field>
        </div>
      </SectionCard>
    </div>
  );
}

function TabModeling({ config, onUpdate }: { config: AppConfig; onUpdate: (partial: Partial<AppConfig>) => void }) {
  return (
    <div className="space-y-4">
      <SectionCard
        icon={<Cpu size={15} />}
        title="Algorithm"
        description="Model selection strategy for each SKU."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field
            label="Algorithm Mode"
            hint="Auto selects the best model per SKU; Manual lets you pick one"
            description="Auto mode runs model comparison and picks the best fit per series"
          >
            <div className="flex gap-2 mt-1">
              {(['auto', 'manual'] as const).map((mode) => (
                <button
                  key={`algo-${mode}`}
                  type="button"
                  onClick={() => onUpdate({ algorithmMode: mode })}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all duration-150 ${
                    config.algorithmMode === mode
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </Field>

          <Field
            label="Selected Algorithm"
            hint="Model to use when algorithm mode is manual"
            description={config.algorithmMode === 'auto' ? 'Unlocked when Algorithm Mode is set to Manual' : 'Applied to all series when running in manual mode'}
            disabled={config.algorithmMode === 'auto'}
          >
            <select
              value={config.selectedAlgorithm}
              onChange={(e) => onUpdate({ selectedAlgorithm: e.target.value })}
              className="input-field text-sm mt-1"
              disabled={config.algorithmMode === 'auto'}
            >
              <option value="lightgbm">LightGBM</option>
              <option value="ets">ETS (Exponential Smoothing)</option>
              <option value="sarima">SARIMA</option>
              <option value="moving-avg">Moving Average</option>
              <option value="croston">Croston (Intermittent)</option>
            </select>
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        icon={<FlaskConical size={15} />}
        title="Seasonality & Data Quality"
        description="How seasonal patterns are detected and how outliers are handled."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field
            label="Seasonality Mode"
            hint="How to detect and model seasonal patterns"
          >
            <select
              value={config.seasonalityMode}
              onChange={(e) => onUpdate({ seasonalityMode: e.target.value as AppConfig['seasonalityMode'] })}
              className="input-field text-sm mt-1"
            >
              <option value="auto">Auto-detect</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="none">None</option>
            </select>
          </Field>

          <Field
            label="Outlier Treatment"
            hint="How to handle outliers in historical data"
          >
            <select
              value={config.outlierTreatment}
              onChange={(e) => onUpdate({ outlierTreatment: e.target.value as AppConfig['outlierTreatment'] })}
              className="input-field text-sm mt-1"
            >
              <option value="none">None</option>
              <option value="winsorize">Winsorize (cap at percentiles)</option>
              <option value="remove">Remove</option>
            </select>
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        icon={<Sparkles size={15} />}
        title="Features & Routing"
        description="Optional signals and automatic model routing."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field
            label="External Regressors"
            hint="Include external factors like promotions, weather, holidays"
          >
            <div className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                checked={config.externalRegressors}
                onChange={(e) => onUpdate({ externalRegressors: e.target.checked })}
                className="rounded border-border text-primary focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">Include external regressors</span>
            </div>
          </Field>

          <Field
            label="Intermittent Routing"
            hint="Automatically route intermittent SKUs to Croston's method"
          >
            <div className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                checked={config.intermittentRouting}
                onChange={(e) => onUpdate({ intermittentRouting: e.target.checked })}
                className="rounded border-border text-primary focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">Route intermittent SKUs</span>
            </div>
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        icon={<Gauge size={15} />}
        title="Validation & Retraining"
        description="How model accuracy is measured over time."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field
            label="Backtesting Window (weeks)"
            hint="Periods used for backtesting model accuracy"
          >
            <input
              type="number"
              value={config.backtestingWindow}
              onChange={(e) => onUpdate({ backtestingWindow: Number(e.target.value) })}
              className="input-field text-sm mt-1"
            />
          </Field>

          <Field
            label="Retraining Frequency"
            hint="How often to retrain models with new data"
          >
            <select
              value={config.retrainingFrequency}
              onChange={(e) => onUpdate({ retrainingFrequency: e.target.value as AppConfig['retrainingFrequency'] })}
              className="input-field text-sm mt-1"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </Field>

          <Field
            label="Prediction Intervals"
            hint="Generate confidence intervals (p10/p90) for forecasts"
          >
            <div className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                checked={config.predictionIntervals}
                onChange={(e) => onUpdate({ predictionIntervals: e.target.checked })}
                className="rounded border-border text-primary focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">Generate prediction intervals</span>
            </div>
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        icon={<Layers size={15} />}
        title="Reconciliation"
        description="How forecasts align across hierarchy levels."
      >
        <Field
          label="Hierarchical Reconciliation"
          hint="Method to reconcile forecasts across hierarchy levels"
        >
          <select
            value={config.hierarchicalReconciliation}
            onChange={(e) => onUpdate({ hierarchicalReconciliation: e.target.value as AppConfig['hierarchicalReconciliation'] })}
            className="input-field text-sm mt-1"
          >
            <option value="none">None</option>
            <option value="bottom-up">Bottom-up</option>
            <option value="top-down">Top-down</option>
            <option value="middle-out">Middle-out</option>
          </select>
        </Field>
      </SectionCard>
    </div>
  );
}

function TabOutputAlerting({ config, onUpdate }: { config: AppConfig; onUpdate: (partial: Partial<AppConfig>) => void }) {
  return (
    <div className="space-y-4">
      <SectionCard
        icon={<Target size={15} />}
        title="Accuracy & Exceptions"
        description="How forecast quality is measured and which SKUs get flagged."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field
            label="Primary Accuracy Metric"
            hint="Metric used for model selection and monitoring"
          >
            <select
              value={config.accuracyMetric}
              onChange={(e) => onUpdate({ accuracyMetric: e.target.value as AppConfig['accuracyMetric'] })}
              className="input-field text-sm mt-1"
            >
              <option value="wape">WAPE (Weighted Absolute Percentage Error)</option>
              <option value="mape">MAPE (Mean Absolute Percentage Error)</option>
              <option value="mase">MASE (Mean Absolute Scaled Error)</option>
              <option value="bias">Bias</option>
            </select>
          </Field>

          <Field
            label="Exception Threshold (%)"
            hint="SKUs with MAPE above this threshold are flagged as exceptions"
          >
            <input
              type="number"
              value={config.exceptionThreshold}
              onChange={(e) => onUpdate({ exceptionThreshold: Number(e.target.value) })}
              className="input-field text-sm mt-1"
            />
          </Field>

          <Field
            label="Reorder Formula"
            hint="Method for calculating reorder quantities"
          >
            <select
              value={config.reorderFormula}
              onChange={(e) => onUpdate({ reorderFormula: e.target.value as AppConfig['reorderFormula'] })}
              className="input-field text-sm mt-1"
            >
              <option value="fixed">Fixed</option>
              <option value="dynamic">Dynamic (forecast-based)</option>
              <option value="safety-stock">Safety Stock Based</option>
            </select>
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        icon={<BellRing size={15} />}
        title="Notifications"
        description="Where exception alerts are delivered."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field
            label="Notification Channel"
            hint="Where to send exception alerts"
          >
            <select
              value={config.notificationChannel}
              onChange={(e) => onUpdate({ notificationChannel: e.target.value as AppConfig['notificationChannel'] })}
              className="input-field text-sm mt-1"
            >
              <option value="email">Email</option>
              <option value="slack">Slack</option>
              <option value="webhook">Webhook</option>
              <option value="none">None</option>
            </select>
          </Field>

          <Field
            label="Notification Email"
            hint="Email address for alert notifications"
          >
            <input
              type="email"
              value={config.notificationEmail}
              onChange={(e) => onUpdate({ notificationEmail: e.target.value })}
              className="input-field text-sm mt-1"
            />
          </Field>
        </div>
      </SectionCard>
    </div>
  );
}

function JsonPreviewPanel({ config }: { config: AppConfig }) {
  return (
    <div className="glass-card h-fit sticky top-24">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Live JSON Preview</h3>
        <span className="text-xs text-muted-foreground">Updates as you edit</span>
      </div>
      <pre className="bg-muted/50 rounded-xl p-4 max-h-[500px] overflow-auto text-xs font-mono text-foreground">
        {JSON.stringify(config, null, 2)}
      </pre>
    </div>
  );
}
