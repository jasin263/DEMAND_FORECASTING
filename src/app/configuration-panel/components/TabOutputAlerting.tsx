'use client';

import React from 'react';

import Badge from '@/components/ui/Badge';
import { Info, Mail, MessageSquare, Webhook, BellOff } from 'lucide-react';
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

const notificationChannels = [
  { id: 'email', label: 'Email', icon: <Mail size={16} /> },
  { id: 'slack', label: 'Slack', icon: <MessageSquare size={16} /> },
  { id: 'webhook', label: 'Webhook', icon: <Webhook size={16} /> },
  { id: 'none', label: 'None', icon: <BellOff size={16} /> },
];

const accuracyMetrics = [
  {
    id: 'wape',
    label: 'WAPE',
    description: 'Weighted Absolute Percentage Error — volume-weighted, robust to low-volume SKUs',
    recommended: true,
  },
  {
    id: 'mape',
    label: 'MAPE',
    description: 'Mean Absolute Percentage Error — simple average across all SKUs, sensitive to near-zero demand',
    recommended: false,
  },
  {
    id: 'mase',
    label: 'MASE',
    description: 'Mean Absolute Scaled Error — scale-independent, compares against naive forecast',
    recommended: false,
  },
  {
    id: 'bias',
    label: 'Bias',
    description: 'Mean Percentage Bias — measures systematic over/under-forecasting direction',
    recommended: false,
  },
];

export default function TabOutputAlerting({ config, onUpdate }: TabProps) {
  return (
    <div className="space-y-4">
      {/* Accuracy metric */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Primary Accuracy Metric</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Used for model selection during backtesting, exception flagging, and dashboard KPIs
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {accuracyMetrics.map((metric) => (
            <button
              key={`metric-${metric.id}`}
              type="button"
              onClick={() => onUpdate({ accuracyMetric: metric.id as ConfigState['accuracyMetric'] })}
              className={`text-left p-3.5 rounded-xl border transition-all duration-150 ${
                config.accuracyMetric === metric.id
                  ? 'border-primary bg-primary/8' :'border-border hover:border-primary/40 hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-semibold text-foreground">{metric.label}</span>
                {metric.recommended && <Badge variant="positive">Recommended</Badge>}
                {config.accuracyMetric === metric.id && !metric.recommended && (
                  <Badge variant="primary">Selected</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{metric.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Exception threshold */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Exception Thresholds</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="label-text">
              Exception Threshold ({config.accuracyMetric.toUpperCase()} %)
              <Tooltip text={`SKUs with ${config.accuracyMetric.toUpperCase()} above this threshold are flagged as exceptions and appear in the Exceptions view.`} />
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Current: SKUs with {config.accuracyMetric.toUpperCase()} &gt; <span className="text-foreground font-medium">{config.exceptionThreshold}%</span> are flagged
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={config.exceptionThreshold}
                onChange={(e) => onUpdate({ exceptionThreshold: Number(e.target.value) })}
                className="flex-1 accent-primary"
              />
              <input
                type="number"
                min={5}
                max={50}
                value={config.exceptionThreshold}
                onChange={(e) => onUpdate({ exceptionThreshold: Number(e.target.value) })}
                className="input-field w-16 text-center text-sm py-1.5"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>5% (strict)</span>
              <span>50% (lenient)</span>
            </div>
          </div>

          <div>
            <label className="label-text">
              Reorder Calculation Formula
              <Tooltip text="How reorder point and recommended order quantity are calculated from the forecast." />
            </label>
            <div className="space-y-2 mt-2">
              {[
                { id: 'dynamic', label: 'Dynamic (P90 × lead time + safety stock)', description: 'Uses P90 forecast for conservative reorder point' },
                { id: 'fixed', label: 'Fixed (avg demand × lead time + safety stock)', description: 'Uses historical average demand — simpler but less responsive' },
                { id: 'safety-stock', label: 'Safety stock only (no reorder point)', description: 'Outputs only safety stock level without reorder point' },
              ].map((formula) => (
                <label
                  key={`formula-${formula.id}`}
                  className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all duration-150 ${
                    config.reorderFormula === formula.id
                      ? 'border-primary bg-primary/8' :'border-border hover:border-primary/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="reorderFormula"
                    value={formula.id}
                    checked={config.reorderFormula === formula.id}
                    onChange={() => onUpdate({ reorderFormula: formula.id as ConfigState['reorderFormula'] })}
                    className="mt-0.5 accent-primary shrink-0"
                  />
                  <div>
                    <p className="text-xs font-medium text-foreground">{formula.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formula.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Notification channel */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Notification Channel</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Receive alerts when exceptions are detected, forecast runs complete, or stockout risk is flagged
        </p>

        <div className="flex gap-2 mb-4">
          {notificationChannels.map((ch) => (
            <button
              key={`ch-${ch.id}`}
              type="button"
              onClick={() => onUpdate({ notificationChannel: ch.id as ConfigState['notificationChannel'] })}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-150 ${
                config.notificationChannel === ch.id
                  ? 'border-primary bg-primary/10 text-primary' :'border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              {ch.icon}
              {ch.label}
            </button>
          ))}
        </div>

        {config.notificationChannel === 'email' && (
          <div className="animate-slide-up">
            <label className="label-text">Notification Email</label>
            <input
              type="email"
              value={config.notificationEmail}
              onChange={(e) => onUpdate({ notificationEmail: e.target.value })}
              className="input-field max-w-sm text-sm"
              placeholder="planner@company.com"
            />
          </div>
        )}

        {config.notificationChannel === 'slack' && (
          <div className="animate-slide-up p-3 bg-muted rounded-lg border border-border text-xs text-muted-foreground">
            Slack integration requires a webhook URL. Configure in the Integrations settings.
          </div>
        )}

        {config.notificationChannel === 'webhook' && (
          <div className="animate-slide-up">
            <label className="label-text">Webhook URL</label>
            <input
              type="url"
              className="input-field max-w-sm text-sm"
              placeholder="https://your-erp.com/api/forecast-alerts"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              ForecastIQ will POST exception payloads to this URL after each run
            </p>
          </div>
        )}
      </div>
    </div>
  );
}