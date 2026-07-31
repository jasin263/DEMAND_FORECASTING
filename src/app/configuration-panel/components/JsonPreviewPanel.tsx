'use client';

import React, { useState } from 'react';
import { Copy, Check, Code2 } from 'lucide-react';
import type { ConfigState } from './ConfigurationPanelClient';

interface JsonPreviewProps {
  config: ConfigState;
}

export default function JsonPreviewPanel({ config }: JsonPreviewProps) {
  const [copied, setCopied] = useState(false);

  const jsonOutput = JSON.stringify(
    {
      tenant_config: {
        data: {
          granularity: config.granularity,
          forecast_horizon: config.forecastHorizon,
          history_window_weeks: config.historyWindow,
          aggregation_hierarchy: config.aggregationHierarchy,
        },
        business: {
          industry_template: config.industryTemplate,
          default_lead_time_days: config.defaultLeadTime,
          shelf_life_days: config.shelfLifeDays,
          moq: config.moq,
          service_level_target_pct: config.serviceLevelTarget,
          promo_calendar_enabled: config.promoCalendarEnabled,
          holidays: config.holidays,
        },
        modeling: {
          algorithm_mode: config.algorithmMode,
          selected_algorithm: config.algorithmMode === 'manual' ? config.selectedAlgorithm : 'auto',
          intermittent_routing: config.intermittentRouting,
          outlier_treatment: config.outlierTreatment,
          seasonality_mode: config.seasonalityMode,
          external_regressors: config.externalRegressors,
          backtesting_window: config.backtestingWindow,
          retraining_frequency: config.retrainingFrequency,
          prediction_intervals: config.predictionIntervals,
          hierarchical_reconciliation: config.hierarchicalReconciliation,
        },
        output: {
          accuracy_metric: config.accuracyMetric,
          exception_threshold_pct: config.exceptionThreshold,
          reorder_formula: config.reorderFormula,
          notification_channel: config.notificationChannel,
          notification_email: config.notificationChannel === 'email' ? config.notificationEmail : null,
        },
      },
    },
    null,
    2
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonOutput).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="glass-card overflow-hidden sticky top-6">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Code2 size={14} className="text-accent" />
          <h3 className="text-xs font-semibold text-foreground">Live JSON Config</h3>
        </div>
        <button
          onClick={handleCopy}
          className="btn-ghost p-1.5 text-xs flex items-center gap-1"
          title="Copy JSON config"
        >
          {copied ? (
            <>
              <Check size={13} className="text-positive" />
              <span className="text-positive text-xs">Copied</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span className="text-xs">Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: 'calc(100vh - 240px)' }}>
        <pre className="p-4 text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap break-all">
          {jsonOutput}
        </pre>
      </div>
      <div className="px-4 py-2.5 border-t border-border bg-muted/20">
        <p className="text-xs text-muted-foreground">
          This JSON is passed to the forecasting engine on each run. You can also POST it directly to{' '}
          <span className="font-mono text-accent">/api/tenants/:id/config</span>
        </p>
      </div>
    </div>
  );
}