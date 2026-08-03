import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useConfiguration, useSaveConfiguration, useRerunForecast } from '../lib/api-hooks';
import {
  Save, RotateCcw, Database, Briefcase, Cpu, Bell, Loader2, Plus, Play, Info,
  CalendarDays, Layers, Target, BellRing, FlaskConical, Sparkles, Gauge,
  ChevronDown, ShieldCheck, FileText, Clock, TrendingUp, Zap,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import FeaturePageShell from '../components/FeaturePageShell';
import type { AppConfig } from '../lib/api-types';

const tabs = [
  { id: 'data', label: 'Data & Time', icon: <Database size={15} />, description: 'Granularity, forecast horizon, history depth, and how series are aggregated.' },
  { id: 'business', label: 'Business Context', icon: <Briefcase size={15} />, description: 'Industry profile, supply chain parameters, and calendar events.' },
  { id: 'modeling', label: 'Modeling', icon: <Cpu size={15} />, description: 'Algorithm selection, seasonality, features, validation, and reconciliation.' },
  { id: 'output', label: 'Output & Alerts', icon: <Bell size={15} />, description: 'Accuracy targets, exception thresholds, and notification delivery.' },
];

const Tooltip = ({ text }: { text: string }) => (
  <span title={text} className="inline-flex ml-1 cursor-help">
    <Info size={12} className="text-muted-foreground hover:text-foreground" />
  </span>
);

function Group({ icon, title, description, children }: { icon: React.ReactNode; title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="mt-3 divide-y divide-border/60">{children}</div>
    </div>
  );
}

function Row({ label, hint, description, children }: { label: string; hint?: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="py-3.5 first:pt-1 last:pb-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 pr-4">
        <div className="flex items-center">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {hint && <Tooltip text={hint} />}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0 sm:w-[340px]">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string; caption?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex flex-col items-center gap-0.5 py-2 px-2 rounded-lg border text-xs font-medium transition-all duration-150 ${
            value === o.value
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40'
          }`}
        >
          <span>{o.label}</span>
          {o.caption && <span className="text-[10px] opacity-70 font-normal">{o.caption}</span>}
        </button>
      ))}
    </div>
  );
}

function NumberInput({ value, onChange, min, max, step, unit }: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input-field text-sm py-1.5 px-2.5 flex-1 text-right font-tabular"
      />
      <span className="text-xs text-muted-foreground w-14 shrink-0">{unit}</span>
    </div>
  );
}

function SliderInput({ value, onChange, min, max, step, unit, minLabel, maxLabel }: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  minLabel?: string;
  maxLabel?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-primary"
        />
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="input-field w-16 text-center text-sm py-1.5 font-tabular"
          />
          <span className="text-xs text-muted-foreground w-10 shrink-0">{unit}</span>
        </div>
      </div>
      {(minLabel || maxLabel) && (
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors duration-200 shrink-0 ${checked ? 'bg-primary' : 'bg-muted'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-4' : ''}`}
        />
      </button>
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
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
  wapeTarget: 15,
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
    try {
      await rerunForecast();
      navigate('/dashboard');
    } catch (err) {
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
        description="All changes apply on the next forecast run"
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

  const activeTabMeta = tabs.find((t) => t.id === activeTab) ?? tabs[0];
  const granularityUnit = config.granularity === 'daily' ? 'days' : config.granularity === 'weekly' ? 'weeks' : 'months';

  return (
    <FeaturePageShell
      title="Configuration Panel"
      description="Tune how your forecasts are built — changes apply on the next forecast run."
      actions={
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="status-badge bg-warning/10 text-warning border border-warning/20 text-xs animate-fade-in">
              Unsaved changes
            </span>
          )}
          <button onClick={handleReset} className="btn-secondary text-xs py-1.5" title="Restore default values">
            <RotateCcw size={13} />
            Reset
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
                Save
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

      {hasChanges && (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 animate-fade-in">
          <p className="text-xs text-warning flex items-center gap-1.5">
            <Zap size={13} />
            You have unsaved changes — save them before running a new forecast.
          </p>
          <button onClick={handleSave} disabled={saving} className="btn-secondary text-xs py-1.5 disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save now
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        <div className="xl:col-span-2 2xl:col-span-3 space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-150 ${
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
            <span className="text-xs text-muted-foreground">{activeTabMeta.description}</span>
          </div>

          <div className="animate-fade-in">
            {activeTab === 'data' && <TabDataGranularity config={config} onUpdate={updateConfig} granularityUnit={granularityUnit} />}
            {activeTab === 'business' && <TabBusinessContext config={config} onUpdate={updateConfig} />}
            {activeTab === 'modeling' && <TabModeling config={config} onUpdate={updateConfig} />}
            {activeTab === 'output' && <TabOutputAlerting config={config} onUpdate={updateConfig} />}
          </div>
        </div>

        <div className="xl:col-span-1 2xl:col-span-1">
          <div className="sticky top-24 space-y-4">
            <SummaryPanel config={config} workspaceContext={workspaceContext} />
          </div>
        </div>
      </div>
    </FeaturePageShell>
  );
}

function TabDataGranularity({ config, onUpdate, granularityUnit }: {
  config: AppConfig;
  onUpdate: (partial: Partial<AppConfig>) => void;
  granularityUnit: string;
}) {
  return (
    <div className="space-y-4">
      <Group
        icon={<CalendarDays size={15} />}
        title="Time & Horizon"
        description="How demand is aggregated and how far the forecast looks ahead."
      >
        <Row
          label="Time granularity"
          hint="The aggregation level for forecasting. Must match your data's natural frequency."
          description="How demand records are aggregated before modeling"
        >
          <Segmented
            value={config.granularity}
            onChange={(v) => onUpdate({ granularity: v })}
            options={[
              { value: 'daily', label: 'Daily', caption: 'Sensing-ready' },
              { value: 'weekly', label: 'Weekly', caption: 'Recommended' },
              { value: 'monthly', label: 'Monthly', caption: 'Coarse' },
            ]}
          />
        </Row>

        <Row
          label="Forecast horizon"
          hint="How far ahead to forecast. Longer horizons produce wider prediction intervals."
          description={`Current: ${config.forecastHorizon} ${granularityUnit}`}
        >
          <SliderInput
            value={config.forecastHorizon}
            onChange={(v) => onUpdate({ forecastHorizon: v })}
            min={config.granularity === 'daily' ? 7 : config.granularity === 'weekly' ? 4 : 1}
            max={config.granularity === 'daily' ? 90 : config.granularity === 'weekly' ? 52 : 24}
            step={config.granularity === 'daily' ? 7 : config.granularity === 'weekly' ? 4 : 1}
            unit={granularityUnit}
            minLabel="Short"
            maxLabel="Long"
          />
        </Row>

        <Row
          label="History window"
          hint="How many periods of history are used for model training. More history improves seasonal detection."
          description="Minimum recommended: 2× seasonal period + forecast horizon"
        >
          <SliderInput
            value={config.historyWindow}
            onChange={(v) => onUpdate({ historyWindow: v })}
            min={26}
            max={260}
            step={26}
            unit="weeks"
            minLabel="26w · 6 months"
            maxLabel="260w · 5 years"
          />
        </Row>
      </Group>

      <Group
        icon={<Layers size={15} />}
        title="Series aggregation"
        description="What constitutes one forecast series."
      >
        <Row
          label="Series key"
          hint="The key combination used as the base forecasting unit"
          description="The level at which demand is modeled and reported"
        >
          <select
            value={config.aggregationHierarchy}
            onChange={(e) => onUpdate({ aggregationHierarchy: e.target.value })}
            className="input-field text-sm w-full"
          >
            <option value="sku">SKU only · aggregate all locations</option>
            <option value="sku-location">SKU × Location · default</option>
            <option value="sku-location-channel">SKU × Location × Channel</option>
            <option value="category-location">Category × Location · high-level</option>
          </select>
        </Row>
      </Group>
    </div>
  );
}

function TabBusinessContext({ config, onUpdate }: { config: AppConfig; onUpdate: (partial: Partial<AppConfig>) => void }) {
  return (
    <div className="space-y-4">
      <Group
        icon={<Briefcase size={15} />}
        title="Industry & supply chain"
        description="Planning parameters applied across all SKUs."
      >
        <Row
          label="Industry template"
          hint="Pre-configured settings for your industry vertical"
        >
          <select
            value={config.industryTemplate}
            onChange={(e) => onUpdate({ industryTemplate: e.target.value })}
            className="input-field text-sm w-full"
          >
            <option value="fmcg">FMCG · Fast-Moving Consumer Goods</option>
            <option value="auto">Auto Parts</option>
            <option value="pharma">Pharmaceuticals</option>
            <option value="custom">Custom</option>
          </select>
        </Row>

        <Row
          label="Service level target"
          hint="Target in-stock probability used for safety stock calculations"
        >
          <NumberInput
            value={config.serviceLevelTarget}
            onChange={(v) => onUpdate({ serviceLevelTarget: v })}
            min={80}
            max={99.9}
            step={0.1}
            unit="%"
          />
        </Row>

        <Row
          label="Default lead time"
          hint="Standard supplier lead time used for reorder calculations"
        >
          <NumberInput
            value={config.defaultLeadTime}
            onChange={(v) => onUpdate({ defaultLeadTime: v })}
            min={1}
            max={90}
            unit="days"
          />
        </Row>

        <Row
          label="Minimum order quantity"
          hint="Minimum order quantity enforced by suppliers"
        >
          <NumberInput
            value={config.moq}
            onChange={(v) => onUpdate({ moq: v })}
            min={0}
            unit="units"
          />
        </Row>

        <Row
          label="Shelf life"
          hint="Product shelf life for perishable goods planning"
        >
          <NumberInput
            value={config.shelfLifeDays}
            onChange={(v) => onUpdate({ shelfLifeDays: v })}
            min={1}
            unit="days"
          />
        </Row>
      </Group>

      <Group
        icon={<CalendarDays size={15} />}
        title="Calendar & promotions"
        description="Holidays and promo events influence demand adjustments."
      >
        <Row
          label="Promo calendar"
          hint="Include promotional events in forecast adjustments"
        >
          <Switch
            checked={config.promoCalendarEnabled}
            onChange={(v) => onUpdate({ promoCalendarEnabled: v })}
            label="Include promotional uplifts"
          />
        </Row>

        <Row
          label="Holidays"
          hint="Dates with expected demand shifts (e.g., national holidays)"
          description="Treated as special events by the seasonality model"
        >
          <div className="space-y-2 w-full">
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
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const holidays = [...config.holidays];
                    holidays.splice(idx, 1);
                    onUpdate({ holidays });
                  }}
                  className="btn-ghost p-1.5 text-muted-foreground hover:text-negative shrink-0"
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
        </Row>
      </Group>
    </div>
  );
}

function TabModeling({ config, onUpdate }: { config: AppConfig; onUpdate: (partial: Partial<AppConfig>) => void }) {
  return (
    <div className="space-y-4">
      <Group
        icon={<Cpu size={15} />}
        title="Algorithm"
        description="Model selection strategy for each SKU."
      >
        <Row
          label="Algorithm mode"
          hint="Auto selects the best model per SKU; Manual lets you pick one"
          description="Auto mode runs model comparison and picks the best fit per series"
        >
          <Segmented
            value={config.algorithmMode}
            onChange={(v) => onUpdate({ algorithmMode: v })}
            options={[
              { value: 'auto', label: 'Auto-select', caption: 'Best per SKU' },
              { value: 'manual', label: 'Manual', caption: 'One model' },
            ]}
          />
        </Row>

        <Row
          label="Selected algorithm"
          hint="Model to use when algorithm mode is manual"
          description={config.algorithmMode === 'auto' ? 'Locked — switch to Manual to choose' : 'Applied to all series'}
        >
          <div className={config.algorithmMode === 'auto' ? 'opacity-45 pointer-events-none' : ''}>
            <select
              value={config.selectedAlgorithm}
              onChange={(e) => onUpdate({ selectedAlgorithm: e.target.value })}
              className="input-field text-sm w-full"
              disabled={config.algorithmMode === 'auto'}
            >
              <option value="lightgbm">LightGBM</option>
              <option value="ets">ETS · Exponential Smoothing</option>
              <option value="sarima">SARIMA</option>
              <option value="moving-avg">Moving Average</option>
              <option value="croston">Croston · Intermittent</option>
            </select>
          </div>
        </Row>
      </Group>

      <Group
        icon={<FlaskConical size={15} />}
        title="Seasonality & data quality"
        description="How seasonal patterns are detected and outliers handled."
      >
        <Row
          label="Seasonality mode"
          hint="How to detect and model seasonal patterns"
        >
          <select
            value={config.seasonalityMode}
            onChange={(e) => onUpdate({ seasonalityMode: e.target.value as AppConfig['seasonalityMode'] })}
            className="input-field text-sm w-full"
          >
            <option value="auto">Auto-detect</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="none">None</option>
          </select>
        </Row>

        <Row
          label="Outlier treatment"
          hint="How to handle outliers in historical data"
        >
          <select
            value={config.outlierTreatment}
            onChange={(e) => onUpdate({ outlierTreatment: e.target.value as AppConfig['outlierTreatment'] })}
            className="input-field text-sm w-full"
          >
            <option value="none">None</option>
            <option value="winsorize">Winsorize · cap at percentiles</option>
            <option value="remove">Remove</option>
          </select>
        </Row>
      </Group>

      <Group
        icon={<Sparkles size={15} />}
        title="Features & routing"
        description="Optional signals and automatic model routing."
      >
        <Row
          label="External regressors"
          hint="Include external factors like promotions, weather, holidays"
        >
          <Switch
            checked={config.externalRegressors}
            onChange={(v) => onUpdate({ externalRegressors: v })}
            label="Include external signals"
          />
        </Row>

        <Row
          label="Intermittent routing"
          hint="Automatically route intermittent SKUs to Croston's method"
        >
          <Switch
            checked={config.intermittentRouting}
            onChange={(v) => onUpdate({ intermittentRouting: v })}
            label="Route intermittent SKUs"
          />
        </Row>
      </Group>

      <Group
        icon={<Gauge size={15} />}
        title="Validation & retraining"
        description="How model accuracy is measured over time."
      >
        <Row
          label="Backtesting window"
          hint="Periods used for backtesting model accuracy"
        >
          <NumberInput
            value={config.backtestingWindow}
            onChange={(v) => onUpdate({ backtestingWindow: v })}
            min={2}
            max={26}
            unit="weeks"
          />
        </Row>

        <Row
          label="Retraining frequency"
          hint="How often to retrain models with new data"
        >
          <select
            value={config.retrainingFrequency}
            onChange={(e) => onUpdate({ retrainingFrequency: e.target.value as AppConfig['retrainingFrequency'] })}
            className="input-field text-sm w-full"
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </Row>

        <Row
          label="Prediction intervals"
          hint="Generate confidence intervals (p10/p90) for forecasts"
        >
          <Switch
            checked={config.predictionIntervals}
            onChange={(v) => onUpdate({ predictionIntervals: v })}
            label="Generate p10/p90 bands"
          />
        </Row>
      </Group>

      <Group
        icon={<Layers size={15} />}
        title="Reconciliation"
        description="How forecasts align across hierarchy levels."
      >
        <Row
          label="Hierarchical reconciliation"
          hint="Method to reconcile forecasts across hierarchy levels"
        >
          <select
            value={config.hierarchicalReconciliation}
            onChange={(e) => onUpdate({ hierarchicalReconciliation: e.target.value as AppConfig['hierarchicalReconciliation'] })}
            className="input-field text-sm w-full"
          >
            <option value="none">None</option>
            <option value="bottom-up">Bottom-up</option>
            <option value="top-down">Top-down</option>
            <option value="middle-out">Middle-out</option>
          </select>
        </Row>
      </Group>
    </div>
  );
}

function TabOutputAlerting({ config, onUpdate }: { config: AppConfig; onUpdate: (partial: Partial<AppConfig>) => void }) {
  return (
    <div className="space-y-4">
      <Group
        icon={<Target size={15} />}
        title="Accuracy & exceptions"
        description="How forecast quality is measured and which SKUs get flagged."
      >
        <Row
          label="Primary accuracy metric"
          hint="Metric used for model selection and monitoring"
        >
          <select
            value={config.accuracyMetric}
            onChange={(e) => onUpdate({ accuracyMetric: e.target.value as AppConfig['accuracyMetric'] })}
            className="input-field text-sm w-full"
          >
            <option value="wape">WAPE · Weighted Absolute Percentage Error</option>
            <option value="mape">MAPE · Mean Absolute Percentage Error</option>
            <option value="mase">MASE · Mean Absolute Scaled Error</option>
            <option value="bias">Bias</option>
          </select>
        </Row>

        <Row
          label="WAPE target"
          hint="Dashboard target the overall WAPE is compared against"
          description="Shown as the goal on the dashboard's WAPE card"
        >
          <NumberInput
            value={config.wapeTarget}
            onChange={(v) => onUpdate({ wapeTarget: v })}
            min={1}
            max={50}
            step={0.5}
            unit="%"
          />
        </Row>

        <Row
          label="Exception threshold"
          hint="SKUs with MAPE above this threshold are flagged as exceptions"
        >
          <NumberInput
            value={config.exceptionThreshold}
            onChange={(v) => onUpdate({ exceptionThreshold: v })}
            min={1}
            max={100}
            unit="%"
          />
        </Row>

        <Row
          label="Reorder formula"
          hint="Method for calculating reorder quantities"
        >
          <select
            value={config.reorderFormula}
            onChange={(e) => onUpdate({ reorderFormula: e.target.value as AppConfig['reorderFormula'] })}
            className="input-field text-sm w-full"
          >
            <option value="fixed">Fixed</option>
            <option value="dynamic">Dynamic · forecast-based</option>
            <option value="safety-stock">Safety-stock based</option>
          </select>
        </Row>
      </Group>

      <Group
        icon={<BellRing size={15} />}
        title="Notifications"
        description="Where exception alerts are delivered."
      >
        <Row
          label="Notification channel"
          hint="Where to send exception alerts"
        >
          <select
            value={config.notificationChannel}
            onChange={(e) => onUpdate({ notificationChannel: e.target.value as AppConfig['notificationChannel'] })}
            className="input-field text-sm w-full"
          >
            <option value="email">Email</option>
            <option value="slack">Slack</option>
            <option value="webhook">Webhook</option>
            <option value="none">None</option>
          </select>
        </Row>

        <Row
          label="Notification email"
          hint="Email address for alert notifications"
        >
          <input
            type="email"
            value={config.notificationEmail}
            onChange={(e) => onUpdate({ notificationEmail: e.target.value })}
            className="input-field text-sm w-full"
          />
        </Row>
      </Group>
    </div>
  );
}

function SummaryPanel({ config, workspaceContext }: {
  config: AppConfig;
  workspaceContext: { workspaceName: string; industry: string; fileName?: string; mapping?: Record<string, unknown>; forecastHorizon?: number; granularity?: string; algorithm?: string } | null;
}) {
  const granularityUnit = config.granularity === 'daily' ? 'days' : config.granularity === 'weekly' ? 'weeks' : 'months';
  const settings: { icon: React.ReactNode; label: string; values: [string, string][] }[] = [
    {
      icon: <Clock size={13} />,
      label: 'Time',
      values: [
        ['Granularity', config.granularity],
        ['Horizon', `${config.forecastHorizon} ${granularityUnit}`],
        ['History', `${config.historyWindow} weeks`],
      ],
    },
    {
      icon: <Cpu size={13} />,
      label: 'Model',
      values: [
        ['Mode', config.algorithmMode === 'auto' ? 'Auto-select' : `Manual · ${config.selectedAlgorithm}`],
        ['Seasonality', config.seasonalityMode === 'auto' ? 'Auto-detect' : config.seasonalityMode],
        ['Metric', config.accuracyMetric.toUpperCase()],
      ],
    },
    {
      icon: <ShieldCheck size={13} />,
      label: 'Supply',
      values: [
        ['Service level', `${config.serviceLevelTarget}%`],
        ['Lead time', `${config.defaultLeadTime} days`],
        ['MOQ', `${config.moq} units`],
      ],
    },
    {
      icon: <BellRing size={13} />,
      label: 'Alerts',
      values: [
        ['Channel', config.notificationChannel === 'none' ? 'None' : config.notificationChannel],
        ['Exception >', `MAPE ${config.exceptionThreshold}%`],
        ['WAPE target', `${config.wapeTarget}%`],
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <TrendingUp size={15} className="text-primary" />
          Effective settings
        </h3>
        <div className="mt-3 space-y-4">
          {settings.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                {group.icon}
                {group.label}
              </p>
              <div className="mt-1.5 divide-y divide-border/60">
                {group.values.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground capitalize">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {workspaceContext && (
        <div className="glass-card p-5">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <FileText size={15} className="text-primary" />
            Dataset
          </h3>
          <p className="mt-2 text-sm font-medium text-foreground truncate">{workspaceContext.fileName || 'Uploaded dataset'}</p>
          <p className="text-xs text-muted-foreground">{workspaceContext.workspaceName} · {workspaceContext.industry}</p>
          {workspaceContext.mapping && (
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
              {(['target_column', 'date_column', 'entity_column'] as const).map((key) => (
                <span key={key} className="rounded-full border border-border bg-background/70 px-2 py-0.5 text-muted-foreground">
                  <span className="capitalize">{key.replace('_column', '')}:</span>{' '}
                  <span className="font-medium text-foreground">{String(workspaceContext.mapping?.[key] ?? '—')}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <details className="glass-card p-5 group">
        <summary className="cursor-pointer text-sm font-semibold text-foreground list-none flex items-center justify-between select-none">
          <span>Raw configuration JSON</span>
          <ChevronDown size={14} className="text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <pre className="mt-3 bg-muted/50 rounded-xl p-4 max-h-[400px] overflow-auto text-[11px] font-mono text-foreground">
          {JSON.stringify(config, null, 2)}
        </pre>
      </details>
    </div>
  );
}
