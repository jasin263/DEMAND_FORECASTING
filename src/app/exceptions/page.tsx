'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import FeaturePageShell from '../components/FeaturePageShell';
import { AlertTriangle, CheckCircle2, Clock3, Sparkles, Filter, CheckCheck, Search, ChevronDown, Download, Loader2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { useExceptions } from '@/lib/api-hooks';

const severityColors: Record<string, 'negative' | 'warning' | 'info'> = {
  High: 'negative',
  Medium: 'warning',
  Low: 'info',
};

const typeLabels: Record<string, string> = {
  'high-mape': 'High MAPE',
  'stockout-risk': 'Stockout Risk',
  'demand-spike': 'Demand Spike',
};

export default function ExceptionsPage() {
  const router = useRouter();
  const { data: exceptions, loading, error, refetch } = useExceptions({ limit: 20 });
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [resolving, setResolving] = useState(false);

  const filtered = filter === 'all' ? exceptions : exceptions?.filter((e) => e.type === filter);
  const allIds = filtered?.map((e) => e.id) ?? [];

  const toggleAll = () => {
    if (selected.size === allIds.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleResolve = async () => {
    setResolving(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSelected(new Set());
    setResolving(false);
    refetch();
  };

  const handleExport = async () => {
    setExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 1400));
    setExporting(false);
  };

  return (
    <FeaturePageShell
      title="Exceptions & Alerts"
      description="Watch critical supply and forecast anomalies, triage them, and keep stakeholders aligned with automated actions."
      badge={exceptions ? `${exceptions.length} active` : 'Live monitoring'}
      actions={
        <>
          <button
            className="btn-secondary text-xs py-1.5"
            disabled={selected.size === 0 || exporting}
            onClick={handleExport}
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export alert feed
          </button>
          <button
            className="btn-primary text-xs py-1.5"
            disabled={selected.size === 0 || resolving}
            onClick={handleResolve}
          >
            {resolving ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
            Resolve ({selected.size})
          </button>
        </>
      }
    >
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {['all', 'high-mape', 'stockout-risk', 'demand-spike'].map((t) => (
            <button
              key={t}
              onClick={() => { setFilter(t); setSelected(new Set()); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === t
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'all' ? 'All Types' : typeLabels[t] || t}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {selected.size > 0 ? `${selected.size} selected` : ''}
        </span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={`skel-exc-${i}`} className="rounded-2xl border border-border bg-card/70 p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 rounded bg-muted mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-muted rounded" />
                    <div className="h-3 w-full bg-muted rounded" />
                    <div className="h-3 w-1/2 bg-muted rounded" />
                  </div>
                </div>
              </div>
            ))
          ) : error ? (
            <div className="rounded-2xl border border-negative/30 bg-negative/5 p-6 text-center">
              <AlertTriangle size={24} className="text-negative mx-auto mb-2" />
              <p className="text-sm text-negative font-medium">Failed to load exceptions</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
              <button onClick={refetch} className="btn-secondary text-xs mt-3 py-1.5">Retry</button>
            </div>
          ) : filtered && filtered.length > 0 ? (
            filtered.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 transition-colors cursor-pointer ${
                  selected.has(item.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card/70 hover:bg-card'
                }`}
                onClick={() => toggleOne(item.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleOne(item.id)}
                        className="rounded border-border text-primary focus:ring-ring shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                      <h2 className="font-semibold text-foreground truncate">{item.name}</h2>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground ml-8">
                      {item.type === 'high-mape' && `MAPE of ${item.mape}% exceeds the ${item.mape && item.mape > 25 ? 'critical' : 'warning'} threshold`}
                      {item.type === 'stockout-risk' && `Only ${item.daysToStockout} days of inventory remaining at current consumption rate`}
                      {item.type === 'demand-spike' && `Demand is ${item.spikeMultiple}x above the weekly average — investigate source`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={severityColors[item.severity || 'Medium']}>
                      {item.severity || 'Medium'}
                    </Badge>
                    {item.type && <Badge variant="info">{typeLabels[item.type] || item.type}</Badge>}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground ml-8">
                  <span className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Recent'}
                  </span>
                  <button
                    className="text-sm font-medium text-primary hover:underline"
                    onClick={(e) => { e.stopPropagation(); router.push(`/skus/${item.sku}`); }}
                  >
                    Investigate
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-border bg-card/70 p-8 text-center">
              <CheckCircle2 size={32} className="text-positive mx-auto mb-3" />
              <h3 className="text-sm font-medium text-foreground">All clear!</h3>
              <p className="text-xs text-muted-foreground mt-1">No exceptions match the current filter.</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Alert workflow</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div className="rounded-xl bg-muted/60 p-3">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-positive" />
                  Auto-detect anomalies
                </div>
                <p className="mt-1">The platform flags stockout risk, demand shifts, and supplier delays as soon as they cross policy thresholds.</p>
              </div>
              <div className="rounded-xl bg-muted/60 p-3">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-positive" />
                  Route to owners
                </div>
                <p className="mt-1">Alerts are grouped by business owner, SKU family, and severity so the right team can act immediately.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {['High', 'Medium', 'Low'].map((sev) => {
              const count = exceptions?.filter((e) => e.severity === sev).length ?? 0;
              return (
                <div key={sev} className="rounded-xl border border-border bg-card/70 p-3 text-center">
                  <p className="text-lg font-bold font-tabular text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground">{sev}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </FeaturePageShell>
  );
}
