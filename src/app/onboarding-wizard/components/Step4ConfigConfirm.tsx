'use client';

import React from 'react';
import { ChevronLeft, Rocket, CheckCircle, Loader2, Edit3 } from 'lucide-react';
import Toggle from '@/components/ui/Toggle';
import Badge from '@/components/ui/Badge';
import type { WizardState } from './OnboardingWizardClient';

interface Step4Props {
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onBack: () => void;
  onLaunch: () => void;
  launching: boolean;
}

const algorithmLabels: Record<string, string> = {
  auto: 'Auto-select (backtesting)',
  lightgbm: 'LightGBM',
  croston: "Croston's / TSB",
  sarima: 'SARIMA',
  ets: 'ETS (Exponential Smoothing)',
  naive: 'Naive / Moving Average',
};

const industryLabels: Record<string, string> = {
  fmcg: 'FMCG / Consumer Goods',
  auto: 'Automobile Spare Parts',
  pharma: 'Pharmaceutical / Medical',
  custom: 'Custom Configuration',
};

export default function Step4ConfigConfirm({ state, onUpdate, onBack, onLaunch, launching }: Step4Props) {
  const updateConfig = (key: keyof WizardState['config'], value: WizardState['config'][keyof WizardState['config']]) => {
    onUpdate({ config: { ...state.config, [key]: value } });
  };

  const mappedCount = Object.values(state.columnMappings).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <CheckCircle size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Ready to launch your first forecast run</h2>
            <p className="text-sm text-muted-foreground">Review and adjust configuration before ForecastIQ trains models for your SKUs.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Workspace', value: state.workspaceName || 'Unnamed Workspace' },
            { label: 'Industry Template', value: industryLabels[state.industry] || state.industry },
            { label: 'Data Source', value: state.uploadedFile?.name ?? 'No file' },
            { label: 'Columns Mapped', value: `${mappedCount} fields` },
          ].map((item) => (
            <div key={`summary-${item.label}`} className="bg-muted rounded-lg p-3">
              <p className="label-text">{item.label}</p>
              <p className="text-sm font-medium text-foreground truncate">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Editable config */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Forecast Configuration</h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Edit3 size={12} />
            <span>Editable — you can change these anytime in the Configuration Panel</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Forecast horizon */}
          <div>
            <label className="label-text">Forecast Horizon (weeks)</label>
            <p className="text-xs text-muted-foreground mb-2">
              How many periods ahead to forecast. Longer horizons increase uncertainty.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={4}
                max={52}
                step={4}
                value={state.config.forecastHorizon}
                onChange={(e) => updateConfig('forecastHorizon', Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="font-tabular font-semibold text-foreground w-16 text-right">
                {state.config.forecastHorizon}w
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>4w (short-term)</span>
              <span>52w (annual)</span>
            </div>
          </div>

          {/* Granularity */}
          <div>
            <label className="label-text">Time Granularity</label>
            <p className="text-xs text-muted-foreground mb-2">
              Aggregation level for forecasting. Must match your data frequency.
            </p>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((g) => (
                <button
                  key={`gran-${g}`}
                  type="button"
                  onClick={() => updateConfig('granularity', g)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all duration-150 ${
                    state.config.granularity === g
                      ? 'border-primary bg-primary/10 text-primary' :'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Algorithm */}
          <div>
            <label className="label-text">Algorithm</label>
            <p className="text-xs text-muted-foreground mb-2">
              Auto-select runs backtesting on 2–3 candidates and picks the best per SKU.
            </p>
            <select
              value={state.config.algorithm}
              onChange={(e) => updateConfig('algorithm', e.target.value)}
              className="input-field text-sm"
            >
              {Object.entries(algorithmLabels).map(([key, label]) => (
                <option key={`algo-${key}`} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <Toggle
              checked={state.config.seasonality}
              onChange={(v) => updateConfig('seasonality', v)}
              label="Seasonality Detection"
              description="Auto-detect and model weekly, monthly, or yearly seasonal patterns"
            />
            <Toggle
              checked={state.config.intermittentHandling}
              onChange={(v) => updateConfig('intermittentHandling', v)}
              label="Intermittent Demand Routing"
              description="Route SKUs with >60% zero-demand periods to Croston's / TSB automatically"
            />
          </div>
        </div>
      </div>

      {/* What happens next */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">What happens when you launch</h3>
        <ol className="space-y-2">
          {[
            { step: '1', label: 'Data ingestion', detail: 'Your file is parsed, validated, and loaded into the platform schema' },
            { step: '2', label: 'Demand pattern detection', detail: 'Each SKU is classified as Smooth, Intermittent, Lumpy, or Seasonal' },
            { step: '3', label: 'Model backtesting', detail: `2–3 candidate models run per SKU; best model selected by ${state.config.algorithm === 'auto' ? 'WAPE' : 'configured algorithm'}` },
            { step: '4', label: 'Forecast generation', detail: `P10/P50/P90 forecasts generated for ${state.config.forecastHorizon} ${state.config.granularity} periods` },
            { step: '5', label: 'Reorder calculation', detail: 'Reorder points and safety stock computed per SKU using lead time and service level target' },
          ].map((item) => (
            <li key={`step-${item.step}`} className="flex items-start gap-3 text-sm">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                {item.step}
              </span>
              <div>
                <span className="font-medium text-foreground">{item.label}</span>
                <span className="text-muted-foreground"> — {item.detail}</span>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="info">~2–5 min</Badge>
          <span>Estimated run time for {state.industry === 'fmcg' ? '342 SKUs' : '200 SKUs'} at {state.config.granularity} granularity</span>
        </div>
      </div>

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="btn-secondary">
          <ChevronLeft size={16} />
          Back
        </button>
        <button
          type="button"
          onClick={onLaunch}
          disabled={launching}
          className="btn-primary px-8 text-sm"
        >
          {launching ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Launching forecast run…
            </>
          ) : (
            <>
              <Rocket size={16} />
              Launch Forecast Run
            </>
          )}
        </button>
      </div>
    </div>
  );
}