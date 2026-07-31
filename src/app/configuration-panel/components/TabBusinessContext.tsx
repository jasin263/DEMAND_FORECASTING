'use client';

import React, { useState } from 'react';
import Toggle from '@/components/ui/Toggle';

import { X, Plus, Info } from 'lucide-react';
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

export default function TabBusinessContext({ config, onUpdate }: TabProps) {
  const [newHoliday, setNewHoliday] = useState('');

  const addHoliday = () => {
    if (newHoliday && !config.holidays.includes(newHoliday)) {
      onUpdate({ holidays: [...config.holidays, newHoliday] });
      setNewHoliday('');
    }
  };

  const removeHoliday = (date: string) => {
    onUpdate({ holidays: config.holidays.filter((d) => d !== date) });
  };

  return (
    <div className="space-y-4">
      {/* Industry template */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Industry Template</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { id: 'fmcg', label: 'FMCG' },
            { id: 'auto', label: 'Auto Parts' },
            { id: 'pharma', label: 'Pharma' },
            { id: 'custom', label: 'Custom' },
          ].map((tmpl) => (
            <button
              key={`tmpl-${tmpl.id}`}
              type="button"
              onClick={() => onUpdate({ industryTemplate: tmpl.id })}
              className={`py-2 text-xs font-medium rounded-lg border transition-all duration-150 ${
                config.industryTemplate === tmpl.id
                  ? 'border-primary bg-primary/10 text-primary' :'border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              {tmpl.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Changing the template updates default algorithm and seasonality settings. Your custom overrides are preserved.
        </p>
      </div>

      {/* Supply chain parameters */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Supply Chain Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="label-text">
              Default Lead Time (days)
              <Tooltip text="Days between placing a purchase order and receiving stock. Used in reorder point = (avg demand × lead time) + safety stock" />
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Per-SKU overrides can be set via the lead_time_days column in your data
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={365}
                value={config.defaultLeadTime}
                onChange={(e) => onUpdate({ defaultLeadTime: Number(e.target.value) })}
                className="input-field w-24 text-sm"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </div>

          <div>
            <label className="label-text">
              Shelf Life / Expiry (days)
              <Tooltip text="Maximum days a unit can be held in inventory. Used to cap reorder quantities for perishable SKUs." />
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Set to 0 to disable shelf-life constraints
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={3650}
                value={config.shelfLifeDays}
                onChange={(e) => onUpdate({ shelfLifeDays: Number(e.target.value) })}
                className="input-field w-24 text-sm"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </div>

          <div>
            <label className="label-text">
              Minimum Order Quantity (MOQ)
              <Tooltip text="Minimum units per purchase order. Reorder recommendations are rounded up to the nearest MOQ multiple." />
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Default applied when per-SKU MOQ is not specified
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={config.moq}
                onChange={(e) => onUpdate({ moq: Number(e.target.value) })}
                className="input-field w-24 text-sm"
              />
              <span className="text-sm text-muted-foreground">units</span>
            </div>
          </div>

          <div>
            <label className="label-text">
              Service Level Target (%)
              <Tooltip text="Target in-stock probability. Higher service level = more safety stock. 97.5% ≈ 2σ above mean demand." />
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Current: <span className="text-foreground font-medium">{config.serviceLevelTarget}%</span> → safety factor ≈ {config.serviceLevelTarget >= 99 ? '2.33σ' : config.serviceLevelTarget >= 97.5 ? '1.96σ' : config.serviceLevelTarget >= 95 ? '1.65σ' : '1.28σ'}
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={85}
                max={99.9}
                step={0.5}
                value={config.serviceLevelTarget}
                onChange={(e) => onUpdate({ serviceLevelTarget: Number(e.target.value) })}
                className="flex-1 accent-primary"
              />
              <span className="font-tabular font-semibold text-foreground w-14 text-right">
                {config.serviceLevelTarget}%
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>85% (lean)</span>
              <span>99.9% (maximum)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendars */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Business Calendars</h3>
        <div className="space-y-4">
          <Toggle
            checked={config.promoCalendarEnabled}
            onChange={(v) => onUpdate({ promoCalendarEnabled: v })}
            label="Promotion Calendar"
            description="Include promotion flags as external regressors in ML models. Requires promo_flag column in your data."
          />

          <div>
            <label className="label-text">
              Holiday / Closure Dates
              <Tooltip text="Dates when demand is suppressed or stores are closed. The model treats these as special events." />
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Add dates when your business is closed or demand is abnormally suppressed
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {config.holidays.map((date) => (
                <div
                  key={`holiday-${date}`}
                  className="flex items-center gap-1 px-2 py-1 bg-muted rounded-lg border border-border text-xs"
                >
                  <span className="font-mono text-foreground">{date}</span>
                  <button
                    type="button"
                    onClick={() => removeHoliday(date)}
                    className="text-muted-foreground hover:text-negative transition-colors ml-0.5"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={newHoliday}
                onChange={(e) => setNewHoliday(e.target.value)}
                className="input-field text-sm py-1.5 w-40"
              />
              <button
                type="button"
                onClick={addHoliday}
                disabled={!newHoliday}
                className="btn-secondary text-xs py-1.5 disabled:opacity-50"
              >
                <Plus size={13} />
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}