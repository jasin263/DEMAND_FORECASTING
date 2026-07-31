'use client';

import React, { useState, useEffect } from 'react';
import { CalendarDays, RefreshCw, Loader2 } from 'lucide-react';
import { useSkus, useAccuracyByCategory, useConfiguration } from '@/lib/api-hooks';

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
  const [reRunning, setReRunning] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const { data: skuData } = useSkus({ pageSize: 1 });
  const { data: catData } = useAccuracyByCategory();
  const { data: config } = useConfiguration();
  const skuCount = skuData?.total ?? 0;

  useEffect(() => {
    fetch('/api/tenants/nestle-fmcg-demo/locations')
      .then(r => r.json())
      .then(setLocations)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setLastUpdated(new Date(lastUpdated.getTime())), 15000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  const horizon = config?.forecastHorizon ?? 12;
  const granularity = config?.granularity ? config.granularity.charAt(0).toUpperCase() + config.granularity.slice(1) : 'Weekly';
  const algorithm = config?.selectedAlgorithm?.toUpperCase() ?? 'LightGBM';
  const modelText = config?.algorithmMode === 'auto' ? `Auto-select (ETS/${algorithm})` : algorithm;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="status-badge bg-positive/10 text-positive border border-positive/20 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-positive inline-block" />
            Live · Updated {ago(lastUpdated)}
          </span>
          <span className="text-xs text-muted-foreground">Nestle FMCG Demo · {skuCount > 0 ? `${skuCount} SKUs` : ''} · {locations.length || '—'} Locations</span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Forecast Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Forecast horizon: <span className="text-foreground">{horizon} weeks</span> · Granularity: <span className="text-foreground">{granularity}</span> · Model: <span className="text-foreground">{modelText}</span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-xs text-muted-foreground">
          <CalendarDays size={13} />
          <span>Jul 1 – Jul 23, 2026</span>
        </div>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="input-field text-xs py-1.5 w-auto"
        >
          <option value="">All Categories</option>
          {catData?.map((c: { category: string; skus: number }) => (
            <option key={c.category} value={c.category}>{c.category} ({c.skus})</option>
          ))}
        </select>
        <select
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          className="input-field text-xs py-1.5 w-auto"
        >
          <option value="">All Locations</option>
          {locations.map((loc: string) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
        <button
          onClick={async () => {
            setReRunning(true);
            try {
              await fetch('/api/tenants/nestle-fmcg-demo/forecast-timeseries/rerun', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
              });
            } catch (_err) {
              // silently fail
            }
            setReRunning(false);
            setLastUpdated(new Date());
          }}
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
