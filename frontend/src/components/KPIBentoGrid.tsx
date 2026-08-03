import React, { useEffect, useState } from 'react';
import { TrendingDown, TrendingUp, AlertTriangle, Package, Activity, Target, Loader2 } from 'lucide-react';
import { useKPISummary, useBacktestResults, useConfiguration } from '../lib/api-hooks';
import { buildWorkspaceKpiSummary, readWorkspaceForecastRun } from '../lib/workspace-forecast';

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function Delta({
  value,
  suffix = 'pp',
  label = 'vs last run',
  lowerIsBetter = true,
  units = false,
}: {
  value: number | null | undefined;
  suffix?: string;
  label?: string;
  lowerIsBetter?: boolean;
  units?: boolean;
}) {
  if (value == null) {
    return <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground"><span>— vs last run</span></div>;
  }
  const isGood = value === 0 ? false : lowerIsBetter ? value < 0 : value > 0;
  const cls = value === 0 ? 'text-muted-foreground' : isGood ? 'text-positive' : 'text-negative';
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : null;
  const display = units
    ? `${value > 0 ? '+' : ''}${formatNumber(value)} units`
    : `${value > 0 ? '+' : ''}${value}${suffix}`;
  return (
    <div className={`flex items-center gap-1 mt-1 text-xs ${cls}`}>
      {Icon && <Icon size={12} />}
      <span>{display} {label}</span>
    </div>
  );
}

export default function KPIBentoGrid() {
  const { data: kpi, loading, error } = useKPISummary();
  const { data: backtest } = useBacktestResults();
  const { data: config } = useConfiguration();
  const [workspaceContext, setWorkspaceContext] = useState<{ workspaceName: string; fileName?: string; mapping?: Record<string, unknown> } | null>(null);
  const [workspaceKpi, setWorkspaceKpi] = useState<ReturnType<typeof buildWorkspaceKpiSummary>>(null);
  const currentRun = backtest?.lastRun ? new Date(backtest.lastRun).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

  const wapeTarget = config?.wapeTarget ?? 15;
  const serviceTarget = config?.serviceLevelTarget ?? 97.5;
  const excThreshold = config?.exceptionThreshold ?? 25;

  useEffect(() => {
    const run = readWorkspaceForecastRun();
    if (run) {
      setWorkspaceContext({
        workspaceName: run.workspaceName || 'Your workspace',
        fileName: run.fileName,
        mapping: run.mapping,
      });
      setWorkspaceKpi(buildWorkspaceKpiSummary(run));
    } else {
      setWorkspaceContext(null);
      setWorkspaceKpi(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`skel-kpi-${i}`} className={`rounded-2xl border border-border bg-card/70 p-4 animate-pulse ${i === 0 ? 'col-span-2 md:col-span-1 xl:col-span-2 2xl:col-span-2' : ''}`}>
            <div className="h-3 w-16 bg-muted rounded mb-2" />
            <div className="h-8 w-20 bg-muted rounded mb-1" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  const metricSummary = workspaceKpi ?? kpi;

  if (error || !metricSummary) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-2xl border border-negative/30 bg-negative/5 p-4 text-center">
          <p className="text-sm text-negative font-medium">Failed to load KPIs</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const wapeStatus = metricSummary.wape < wapeTarget ? 'Good' : metricSummary.wape < wapeTarget + 5 ? 'Fair' : 'Needs attention';
  const wapeStatusCls = metricSummary.wape < wapeTarget ? 'text-positive' : metricSummary.wape < wapeTarget + 5 ? 'text-warning' : 'text-negative';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
      <div className="col-span-2 md:col-span-1 xl:col-span-2 2xl:col-span-2 glass-card p-5 relative overflow-hidden">
        <div className="blob-primary absolute -top-8 -right-8 w-32 h-32 pointer-events-none" />
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="metric-label">Overall WAPE</p>
            <p className="text-xs text-muted-foreground mt-0.5">Weighted Absolute % Error</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Target size={18} className="text-primary" />
          </div>
        </div>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold font-tabular text-foreground">
            {metricSummary.wape}
            <span className="text-xl text-muted-foreground">%</span>
          </span>
          <Delta value={metricSummary.wapeDelta} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 bg-muted rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-positive" style={{ width: `${Math.min(100, 100 - metricSummary.wape * 2)}%` }} />
          </div>
          <span className={`text-xs font-medium ${wapeStatusCls}`}>{wapeStatus}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          {workspaceContext?.fileName ? `Source: ${workspaceContext.fileName}` : 'Source: uploaded dataset'} · Target: {'<'}{wapeTarget}% · Current run: {currentRun}
        </p>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="metric-label">Avg. MAPE</p>
          <Activity size={15} className="text-muted-foreground" />
        </div>
        <p className="text-2xl font-bold font-tabular text-foreground">
          {metricSummary.mape}<span className="text-base text-muted-foreground">%</span>
        </p>
        <Delta value={metricSummary.mapeDelta} />
        <p className="text-xs text-muted-foreground mt-1.5">Per-SKU mean</p>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="metric-label">P50 Forecast (12w)</p>
          <Package size={15} className="text-muted-foreground" />
        </div>
        <p className="text-2xl font-bold font-tabular text-foreground">
          {formatNumber(metricSummary.totalForecastedDemand)}
        </p>
        <Delta value={metricSummary.totalForecastedDemandDelta} units label="vs prior run" lowerIsBetter={false} />
        <p className="text-xs text-muted-foreground mt-1.5">Units across all SKUs</p>
      </div>

      <div className="glass-card p-4 border-warning/30 bg-warning/5">
        <div className="flex items-center justify-between mb-2">
          <p className="metric-label text-warning">Exception SKUs</p>
          <AlertTriangle size={15} className="text-warning" />
        </div>
        <p className="text-2xl font-bold font-tabular text-warning">
          {metricSummary.exceptionSkus}
        </p>
        <Delta value={metricSummary.exceptionSkusDelta} suffix="" />
        <p className="text-xs text-muted-foreground mt-1.5">MAPE {'>'}{excThreshold}% threshold</p>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="metric-label">Forecast Bias</p>
          <TrendingDown size={15} className="text-accent" />
        </div>
        <p className="text-2xl font-bold font-tabular text-accent">
          {metricSummary.forecastBias}<span className="text-base text-muted-foreground">%</span>
        </p>
        <div className="flex items-center gap-1 mt-1 text-accent text-xs">
          <span>{metricSummary.forecastBias < 0 ? 'Under-forecasting' : 'Over-forecasting'}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">{metricSummary.forecastBias < 0 ? 'Forecast below actual — stock risk' : 'Forecast above actual — stock surplus'}</p>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="metric-label">Service Level</p>
          <Target size={15} className="text-positive" />
        </div>
        <p className="text-2xl font-bold font-tabular text-foreground">
          {metricSummary.serviceLevel}<span className="text-base text-muted-foreground">%</span>
        </p>
        <Delta value={metricSummary.serviceLevelDelta} lowerIsBetter={false} />
        <p className="text-xs text-muted-foreground mt-1.5">Target: {serviceTarget}%</p>
      </div>
    </div>
  );
}
