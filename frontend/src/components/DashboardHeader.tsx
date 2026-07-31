import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { AppConfig } from '../lib/api-types';
import { CalendarDays, RefreshCw, Loader2 } from 'lucide-react';
import { useSkus, useAccuracyByCategory, useConfiguration, useForecastTimeseries, useRerunForecast, useLocations } from '../lib/api-hooks';

interface Props {
  category: string;
  onCategoryChange: (v: string) => void;
  location: string;
  onLocationChange: (v: string) => void;
}

function ago(from: Date): string {
  const diff = Math.floor((Date.now() - from.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

export default function DashboardHeader({ category, onCategoryChange, location, onLocationChange }: Props) {
  const { execute: rerun, loading: reRunning } = useRerunForecast();
  const { data: locations } = useLocations();
  const lastUpdated = useRef(new Date());
  const [, setTick] = useState(0);
  const { data: skuData } = useSkus({ pageSize: 1 });
  const { data: catData } = useAccuracyByCategory();
  const { data: config } = useConfiguration();
  const [workspaceContext, setWorkspaceContext] = useState<{ workspaceName: string; industry: string; fileName?: string; mapping?: Record<string, unknown> } | null>(null);
  const skuCount = skuData?.total ?? 0;

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('forecastiq.lastForecastRun');
      if (stored) {
        const parsed = JSON.parse(stored);
        setWorkspaceContext({
          workspaceName: parsed.workspaceName || 'Untitled workspace',
          industry: parsed.industry || 'custom',
          fileName: parsed.fileName,
          mapping: parsed.mapping,
        });
      }
    } catch {
      setWorkspaceContext(null);
    }
  }, []);

  const { data: ts } = useForecastTimeseries({ weeks: 52 });

  const dateRange = useMemo(() => {
    if (ts && ts.length > 0) {
      const first = ts.find(w => w.actual !== null);
      const last = ts[ts.length - 1];
      if (first && last) return `${first.week} – ${last.week}`;
    }
    return null;
  }, [ts]);

  const horizon = config?.forecastHorizon ?? 12;
  const granularity = config?.granularity ? config.granularity.charAt(0).toUpperCase() + config.granularity.slice(1) : 'Weekly';
  const algorithm = config?.selectedAlgorithm?.toUpperCase() ?? 'Prophet';
  const modelText = config?.algorithmMode === 'auto' ? `Auto-select (ETS/${algorithm})` : algorithm;

  const handleRerun = async () => {
    await rerun();
    lastUpdated.current = new Date();
    setTick(t => t + 1);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="status-badge bg-positive/10 text-positive border border-positive/20 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-positive inline-block" />
            Live · Updated {ago(lastUpdated.current)}
          </span>
          <span className="text-xs text-muted-foreground">
            {workspaceContext?.workspaceName || 'Nestle FMCG Demo'} · {workspaceContext?.industry ? `${workspaceContext.industry.toUpperCase()} · ` : ''}{skuCount > 0 ? `${skuCount} SKUs` : ''} · {locations?.length || '—'} Locations
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Forecast Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {workspaceContext?.fileName ? `Dataset: ${workspaceContext.fileName}` : 'Using your uploaded dataset'} · Forecast horizon: <span className="text-foreground">{horizon} weeks</span> · Granularity: <span className="text-foreground">{granularity}</span> · Model: <span className="text-foreground">{modelText}</span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-xs text-muted-foreground">
          <CalendarDays size={13} />
          <span>{dateRange ?? 'N/A'}</span>
        </div>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="input-field text-xs py-1.5 w-auto"
        >
          <option value="">All Categories</option>
          {catData?.map((c) => (
            <option key={c.category} value={c.category}>{c.category} ({c.skus})</option>
          ))}
        </select>
        <select
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          className="input-field text-xs py-1.5 w-auto"
        >
          <option value="">All Locations</option>
          {locations?.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
        <button
          onClick={handleRerun}
          className="btn-secondary text-xs py-1.5"
          disabled={reRunning}
        >
          {reRunning ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {reRunning ? 'Running…' : 'Re-run'}
        </button>
      </div>
    </div>
  );
}
