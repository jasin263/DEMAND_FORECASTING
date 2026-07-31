'use client';

'use client';

import React from 'react';
import { TrendingDown, TrendingUp, AlertTriangle, Package, Activity, Target } from 'lucide-react';
import { useKPISummary } from '@/lib/api-hooks';

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function KPIBentoGrid() {
  const { data: kpi, loading, error, refetch } = useKPISummary();

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`kpi-sk-${i}`} className="glass-card p-5 animate-pulse">
            <div className="space-y-2">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-8 w-20 bg-muted rounded" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !kpi) {
    return (
      <div className="rounded-2xl border border-negative/30 bg-negative/5 p-6 text-center">
        <AlertTriangle size={24} className="text-negative mx-auto mb-2" />
        <p className="text-sm text-negative font-medium">Failed to load KPI summary</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
        <button onClick={refetch} className="btn-secondary text-xs mt-3 py-1.5">Retry</button>
      </div>
    );
  }

  const kpiData = {
    wape: { value: kpi.wape, delta: kpi.wapeDelta, trend: 'positive' as const },
    mape: { value: kpi.mape, delta: kpi.mapeDelta, trend: 'negative' as const },
    totalForecastedDemand: { value: kpi.totalForecastedDemand, delta: kpi.totalForecastedDemandDelta, trend: 'positive' as const },
    exceptionSkus: { value: kpi.exceptionSkus, delta: kpi.exceptionSkusDelta, trend: 'negative' as const },
    forecastBias: { value: kpi.forecastBias, trend: 'warning' as const },
    serviceLevel: { value: kpi.serviceLevel, delta: kpi.serviceLevelDelta, trend: 'positive' as const },
  };

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
            {kpiData.wape.value}
            <span className="text-xl text-muted-foreground">%</span>
          </span>
          <div className="flex items-center gap-1 mb-1 text-positive text-xs font-medium">
            <TrendingDown size={14} />
            <span>{Math.abs(kpiData.wape.delta)}pp vs last run</span>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 bg-muted rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-positive" style={{ width: '72%' }} />
          </div>
          <span className="text-xs text-positive font-medium">Good</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">Target: &lt;15% · Current run: Jul 23, 2026</p>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="metric-label">Avg. MAPE</p>
          <Activity size={15} className="text-muted-foreground" />
        </div>
        <p className="text-2xl font-bold font-tabular text-foreground">
          {kpiData.mape.value}<span className="text-base text-muted-foreground">%</span>
        </p>
        <div className="flex items-center gap-1 mt-1 text-negative text-xs">
          <TrendingUp size={12} />
          <span>+{kpiData.mape.delta}pp vs last run</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">Per-SKU mean · 342 SKUs</p>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="metric-label">P50 Forecast (12w)</p>
          <Package size={15} className="text-muted-foreground" />
        </div>
        <p className="text-2xl font-bold font-tabular text-foreground">
          {formatNumber(kpiData.totalForecastedDemand.value)}
        </p>
        <div className="flex items-center gap-1 mt-1 text-positive text-xs">
          <TrendingUp size={12} />
          <span>+{kpiData.totalForecastedDemand.delta}% vs prior period</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">Units across all SKUs</p>
      </div>

      <div className="glass-card p-4 border-warning/30 bg-warning/5">
        <div className="flex items-center justify-between mb-2">
          <p className="metric-label text-warning">Exception SKUs</p>
          <AlertTriangle size={15} className="text-warning" />
        </div>
        <p className="text-2xl font-bold font-tabular text-warning">
          {kpiData.exceptionSkus.value}
        </p>
        <div className="flex items-center gap-1 mt-1 text-warning text-xs">
          <TrendingUp size={12} />
          <span>+{kpiData.exceptionSkus.delta} new this run</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">MAPE &gt; 25% threshold</p>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="metric-label">Forecast Bias</p>
          <TrendingDown size={15} className="text-accent" />
        </div>
        <p className="text-2xl font-bold font-tabular text-accent">
          {kpiData.forecastBias.value}<span className="text-base text-muted-foreground">%</span>
        </p>
        <div className="flex items-center gap-1 mt-1 text-accent text-xs">
          <span>Under-forecasting</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">Negative = stock risk</p>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="metric-label">Service Level</p>
          <Target size={15} className="text-positive" />
        </div>
        <p className="text-2xl font-bold font-tabular text-foreground">
          {kpiData.serviceLevel.value}<span className="text-base text-muted-foreground">%</span>
        </p>
        <div className="flex items-center gap-1 mt-1 text-positive text-xs">
          <TrendingUp size={12} />
          <span>+{kpiData.serviceLevel.delta}pp vs last week</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">Target: 97.5%</p>
      </div>
    </div>
  );
}