'use client';

import React, { useState } from 'react';
import FeaturePageShell from '../components/FeaturePageShell';
import { BarChart3, TrendingUp, Target, AlertTriangle, CheckCircle2, Clock, RefreshCw, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { useModelAnalytics, useBacktestResults } from '@/lib/api-hooks';

const trendIcon = (trend: string) => {
  if (trend === 'positive') return <ArrowUp size={14} className="text-positive shrink-0" />;
  if (trend === 'negative') return <ArrowDown size={14} className="text-negative shrink-0" />;
  return <ArrowUpDown size={14} className="text-muted-foreground shrink-0" />;
};

export default function ModelAnalyticsPage() {
  const { data: analytics, loading, error, refetch: refetchAnalytics } = useModelAnalytics();
  const { data: backtest, loading: loadingBacktest, refetch: refetchBacktest } = useBacktestResults();

  const metrics = analytics?.metrics ?? [];
  const comparison = analytics?.comparison ?? [];
  const bestModel = comparison[0];

  const handleRefresh = async () => {
    await Promise.all([refetchAnalytics(), refetchBacktest()]);
  };

  const handleRunBacktest = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1400));
    refetchBacktest();
  };

  return (
    <FeaturePageShell
      title="Model Analytics"
      description="Measure forecast quality, compare model behavior, and inspect the performance drivers behind each run."
      badge="Performance monitoring"
      actions={
        <>
          <button className="btn-secondary text-xs py-1.5" onClick={handleRefresh} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh
          </button>
          <button className="btn-primary text-xs py-1.5" onClick={handleRunBacktest} disabled={loadingBacktest}>
            {loadingBacktest ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
            Run backtest
          </button>
        </>
      }
    >
      {error ? (
        <div className="rounded-2xl border border-negative/30 bg-negative/5 p-6 text-center">
          <AlertTriangle size={24} className="text-negative mx-auto mb-2" />
          <p className="text-sm text-negative font-medium">Failed to load model analytics</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
          <button onClick={handleRefresh} className="btn-secondary text-xs mt-3 py-1.5">Retry</button>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-2xl border border-border bg-card/70 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  {trendIcon(m.trend)}
                </div>
                <p className="mt-1 text-2xl font-semibold text-foreground font-tabular">{m.value}</p>
                <span className={`text-xs font-medium ${m.trend === 'positive' ? 'text-positive' : m.trend === 'negative' ? 'text-negative' : 'text-muted-foreground'}`}>
                  {m.delta} vs last run
                </span>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-border bg-card/70 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border">
                <h2 className="font-semibold text-foreground">Model Performance Comparison</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Last 4 backtest windows · Avg of all SKUs</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="table-header-cell">Model</th>
                      <th className="table-header-cell">Accuracy</th>
                      <th className="table-header-cell">Bias</th>
                      <th className="table-header-cell">Coverage</th>
                      <th className="table-header-cell">Speed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((m, i) => (
                      <tr key={m.name} className={`table-row-hover ${i === 0 ? 'bg-primary/5' : ''}`}>
                        <td className="table-cell">
                          <span className="font-medium flex items-center gap-2">
                            {m.name}
                            {i === 0 && <Badge variant="positive">Best</Badge>}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className="font-tabular">{m.accuracy}%</span>
                        </td>
                        <td className="table-cell">
                          <span className="font-tabular">{m.bias}%</span>
                        </td>
                        <td className="table-cell">
                          <span className="font-tabular">{m.coverage}%</span>
                        </td>
                        <td className="table-cell">
                          <span className="text-xs text-muted-foreground">{m.speed}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              {bestModel && (
                <div className="rounded-2xl border border-border bg-card/70 p-5">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-positive" />
                    <h2 className="font-semibold text-foreground">Top Performer</h2>
                  </div>
                  <div className="mt-3">
                    <p className="text-lg font-bold text-foreground">{bestModel.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Outperforms baseline by 4.7% on recent retail demand patterns
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-muted/60 p-2 text-center">
                      <p className="text-xs text-muted-foreground">Accuracy</p>
                      <p className="font-semibold text-foreground font-tabular">{bestModel.accuracy}%</p>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-2 text-center">
                      <p className="text-xs text-muted-foreground">Bias</p>
                      <p className="font-semibold text-foreground font-tabular">{bestModel.bias}%</p>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-2 text-center">
                      <p className="text-xs text-muted-foreground">Coverage</p>
                      <p className="font-semibold text-foreground font-tabular">{bestModel.coverage}%</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border bg-card/70 p-5">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Attention Area</h2>
                </div>
                <div className="mt-3 rounded-xl bg-warning/5 border border-warning/20 p-3">
                  <div className="flex items-center gap-2 font-medium text-foreground text-sm">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Promotion-heavy categories
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Need another calibration pass to reduce weekly variance during peak events.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card/70 p-5">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Last Training Run</h2>
                </div>
                {backtest ? (
                  <>
                    <p className="mt-2 text-sm text-foreground">{backtest.lastRun}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Duration: {backtest.duration} · {backtest.skuCount} SKUs · {backtest.locations} locations
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Run a backtest to see the latest training details.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </FeaturePageShell>
  );
}
