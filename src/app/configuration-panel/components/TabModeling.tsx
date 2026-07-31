'use client';

import React from 'react';
import Toggle from '@/components/ui/Toggle';
import Badge from '@/components/ui/Badge';
import { Info, Zap, TrendingUp, BarChart2, Activity, GitBranch, Cpu } from 'lucide-react';
import type { ConfigState } from './ConfigurationPanelClient';

interface TabProps {
  config: ConfigState;
  onUpdate: (partial: Partial<ConfigState>) => void;
}

const Tooltip = ({ text }: { text: string }) => (
  <span title={text} className="inline-flex ml-1 cursor-help">
    <Info size={12} className="text-muted-foreground hover:text-foreground" />
  </span>
);

const algorithms = [
  {
    id: 'lightgbm',
    label: 'LightGBM',
    icon: <Zap size={16} />,
    description: 'Gradient boosted trees with lag features, rolling statistics, and external regressors. Best for high-frequency FMCG SKUs with promotions.',
    badge: 'ML · Fast',
    badgeVariant: 'primary' as const,
    bestFor: 'FMCG, Retail',
  },
  {
    id: 'ets',
    label: 'ETS',
    icon: <TrendingUp size={16} />,
    description: 'Exponential Smoothing State Space model. Handles trend and seasonality automatically. Reliable baseline for smooth demand patterns.',
    badge: 'Statistical',
    badgeVariant: 'info' as const,
    bestFor: 'Smooth demand',
  },
  {
    id: 'sarima',
    label: 'SARIMA',
    icon: <Activity size={16} />,
    description: 'Seasonal ARIMA with configurable (p,d,q)(P,D,Q)s parameters. Excellent for strong seasonal patterns like pharma flu-season demand.',
    badge: 'Statistical',
    badgeVariant: 'info' as const,
    bestFor: 'Pharma, Seasonal',
  },
  {
    id: 'croston',
    label: "Croston\'s / TSB",
    icon: <BarChart2 size={16} />,
    description: "Croston\'s method and Teunter-Syntetos-Babai variant for intermittent demand. Separates demand size from demand occurrence.",
    badge: 'Intermittent',
    badgeVariant: 'warning' as const,
    bestFor: 'Auto parts, Spare parts',
  },
  {
    id: 'prophet',
    label: 'Prophet-style',
    icon: <GitBranch size={16} />,
    description: 'Additive decomposition model with trend changepoints, seasonality, and holiday effects. Good for business-calendar-aware forecasting.',
    badge: 'Decomposition',
    badgeVariant: 'neutral' as const,
    bestFor: 'Holiday-heavy SKUs',
  },
  {
    id: 'naive',
    label: 'Naive / Moving Avg',
    icon: <Cpu size={16} />,
    description: 'Simple benchmarks: seasonal naive (repeat last year) and moving average. Used as baselines for backtesting and new SKUs with short history.',
    badge: 'Baseline',
    badgeVariant: 'neutral' as const,
    bestFor: 'New SKUs, benchmarks',
  },
];

export default function TabModeling({ config, onUpdate }: TabProps) {
  return (
    <div className="space-y-4">
      {/* Algorithm selection */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Algorithm Selection</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Mode:</span>
            <div className="flex gap-1 bg-muted rounded-lg p-0.5">
              {(['auto', 'manual'] as const).map((mode) => (
                <button
                  key={`mode-${mode}`}
                  type="button"
                  onClick={() => onUpdate({ algorithmMode: mode })}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-150 ${
                    config.algorithmMode === mode
                      ? 'bg-primary/10 text-primary' :'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {mode === 'auto' ? 'Auto-select' : 'Manual'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {config.algorithmMode === 'auto' && (
          <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg mb-4 text-xs">
            <Info size={13} className="text-primary shrink-0 mt-0.5" />
            <p className="text-muted-foreground">
              <span className="text-primary font-medium">Auto-select mode:</span> ForecastIQ runs backtesting on 2–3 candidate models per SKU and selects the one with the lowest {config.accuracyMetric.toUpperCase()}. Intermittent SKUs are automatically routed to Croston's / TSB regardless of this setting.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {algorithms.map((algo) => {
            const isSelected = config.selectedAlgorithm === algo.id;
            const isDisabled = config.algorithmMode === 'auto' && algo.id !== 'lightgbm';

            return (
              <button
                key={`algo-${algo.id}`}
                type="button"
                disabled={config.algorithmMode === 'auto'}
                onClick={() => onUpdate({ selectedAlgorithm: algo.id })}
                className={`text-left p-3.5 rounded-xl border transition-all duration-150 ${
                  isSelected && config.algorithmMode === 'manual' ?'border-primary bg-primary/8'
                    : config.algorithmMode === 'auto'&& algo.id === 'lightgbm' ?'border-accent/30 bg-accent/5' :'border-border hover:border-primary/40 hover:bg-muted/40'
                } ${isDisabled ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected && config.algorithmMode === 'manual' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {algo.icon}
                    </div>
                    <span className="text-sm font-semibold text-foreground">{algo.label}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant={algo.badgeVariant}>{algo.badge}</Badge>
                    {config.algorithmMode === 'auto' && algo.id === 'lightgbm' && (
                      <Badge variant="info">Default</Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-2">{algo.description}</p>
                <p className="text-xs text-muted-foreground">
                  Best for: <span className="text-foreground">{algo.bestFor}</span>
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Model behavior */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Model Behavior</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-4">
            <Toggle
              checked={config.intermittentRouting}
              onChange={(v) => onUpdate({ intermittentRouting: v })}
              label="Intermittent Demand Routing"
              description="Auto-route SKUs with >60% zero-demand periods to Croston's / TSB, regardless of the selected algorithm"
            />
            <Toggle
              checked={config.externalRegressors}
              onChange={(v) => onUpdate({ externalRegressors: v })}
              label="External Regressors"
              description="Include price, promo flags, and holiday indicators as features in ML models"
            />
            <Toggle
              checked={config.predictionIntervals}
              onChange={(v) => onUpdate({ predictionIntervals: v })}
              label="Prediction Intervals (P10/P90)"
              description="Generate P10 and P90 quantile forecasts alongside P50. Adds ~40% to run time."
            />
          </div>

          <div className="space-y-4">
            {/* Outlier treatment */}
            <div>
              <label className="label-text">
                Outlier Treatment
                <Tooltip text="How to handle demand spikes before model training. Winsorize caps extreme values; Remove excludes them." />
              </label>
              <select
                value={config.outlierTreatment}
                onChange={(e) => onUpdate({ outlierTreatment: e.target.value as ConfigState['outlierTreatment'] })}
                className="input-field text-sm mt-1.5"
              >
                <option value="none">None — use raw data as-is</option>
                <option value="winsorize">Winsorize at 99th percentile</option>
                <option value="remove">Remove outliers (&gt;3σ)</option>
              </select>
            </div>

            {/* Seasonality */}
            <div>
              <label className="label-text">
                Seasonality Mode
                <Tooltip text="How seasonal patterns are detected and modeled." />
              </label>
              <select
                value={config.seasonalityMode}
                onChange={(e) => onUpdate({ seasonalityMode: e.target.value as ConfigState['seasonalityMode'] })}
                className="input-field text-sm mt-1.5"
              >
                <option value="auto">Auto-detect (recommended)</option>
                <option value="weekly">Weekly (period = 7)</option>
                <option value="monthly">Monthly (period = 30/31)</option>
                <option value="yearly">Yearly (period = 52 weeks)</option>
                <option value="none">None — no seasonality</option>
              </select>
            </div>

            {/* Hierarchical reconciliation */}
            <div>
              <label className="label-text">
                Hierarchical Reconciliation
                <Tooltip text="Method to ensure forecasts at different aggregation levels are consistent." />
              </label>
              <select
                value={config.hierarchicalReconciliation}
                onChange={(e) => onUpdate({ hierarchicalReconciliation: e.target.value as ConfigState['hierarchicalReconciliation'] })}
                className="input-field text-sm mt-1.5"
              >
                <option value="none">None</option>
                <option value="bottom-up">Bottom-up (sum SKU forecasts)</option>
                <option value="top-down">Top-down (disaggregate total)</option>
                <option value="middle-out">Middle-out (category level)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Training settings */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Training & Retraining</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="label-text">
              Backtesting Window (periods)
              <Tooltip text="Number of periods held out for backtesting during model selection. Larger windows give more reliable accuracy estimates." />
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Must be ≥ forecast horizon. Current: <span className="text-foreground font-medium">{config.backtestingWindow} periods</span>
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={4}
                max={26}
                step={2}
                value={config.backtestingWindow}
                onChange={(e) => onUpdate({ backtestingWindow: Number(e.target.value) })}
                className="flex-1 accent-primary"
              />
              <input
                type="number"
                value={config.backtestingWindow}
                onChange={(e) => onUpdate({ backtestingWindow: Math.max(4, Number(e.target.value)) })}
                className="input-field w-16 text-center text-sm py-1.5"
              />
            </div>
          </div>

          <div>
            <label className="label-text">
              Model Retraining Frequency
              <Tooltip text="How often models are retrained on fresh data. More frequent retraining improves accuracy but increases compute cost." />
            </label>
            <div className="flex gap-2 mt-1.5">
              {(['weekly', 'biweekly', 'monthly'] as const).map((f) => (
                <button
                  key={`retrain-${f}`}
                  type="button"
                  onClick={() => onUpdate({ retrainingFrequency: f })}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all duration-150 ${
                    config.retrainingFrequency === f
                      ? 'border-primary bg-primary/10 text-primary' :'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}