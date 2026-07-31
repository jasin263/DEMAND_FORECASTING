'use client';

import React from 'react';

import type { ConfigState } from './ConfigurationPanelClient';
import { Info } from 'lucide-react';

interface TabProps {
  config: ConfigState;
  onUpdate: (partial: Partial<ConfigState>) => void;
}

const Tooltip = ({ text }: { text: string }) => (
  <span title={text} className="inline-flex ml-1 cursor-help">
    <Info size={12} className="text-muted-foreground hover:text-foreground" />
  </span>
);

export default function TabDataGranularity({ config, onUpdate }: TabProps) {
  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Time Granularity & Horizon</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Granularity */}
          <div>
            <label className="label-text">
              Time Granularity
              <Tooltip text="The aggregation level for forecasting. Must match your data's natural frequency." />
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Determines how demand records are aggregated before modeling
            </p>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((g) => (
                <button
                  key={`gran-${g}`}
                  type="button"
                  onClick={() => onUpdate({ granularity: g })}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all duration-150 ${
                    config.granularity === g
                      ? 'border-primary bg-primary/10 text-primary' :'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40'
                  }`}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Aggregation hierarchy */}
          <div>
            <label className="label-text">
              Aggregation Hierarchy
              <Tooltip text="The key combination used as the base forecasting unit" />
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Defines what constitutes one forecast series
            </p>
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
          </div>

          {/* Forecast horizon */}
          <div>
            <label className="label-text">
              Forecast Horizon ({config.granularity === 'daily' ? 'days' : config.granularity === 'weekly' ? 'weeks' : 'months'})
              <Tooltip text="How far ahead to forecast. Longer horizons produce wider prediction intervals." />
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Current: <span className="text-foreground font-medium">{config.forecastHorizon} {config.granularity === 'daily' ? 'days' : config.granularity === 'weekly' ? 'weeks' : 'months'}</span>
            </p>
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
          </div>

          {/* History window */}
          <div>
            <label className="label-text">
              History Window (weeks)
              <Tooltip text="How many periods of history are used for model training. More history improves seasonal detection." />
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Minimum recommended: 2× seasonal period + forecast horizon
            </p>
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
          </div>
        </div>
      </div>

      {/* Summary card */}
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