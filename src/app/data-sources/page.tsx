'use client';

import React, { useState } from 'react';
import FeaturePageShell from '../components/FeaturePageShell';
import { Database, CheckCircle2, RefreshCw, PlugZap, AlertCircle, Wifi, WifiOff, Clock, Plus, Trash2, Loader2 } from 'lucide-react';
import { useDataSources } from '@/lib/api-hooks';
import type { DataSource } from '@/lib/api-types';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';

const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  Connected: { color: 'text-positive', bg: 'bg-positive/10', icon: <Wifi size={12} /> },
  Syncing: { color: 'text-accent', bg: 'bg-accent/10', icon: <RefreshCw size={12} className="animate-spin" /> },
  Error: { color: 'text-negative', bg: 'bg-negative/10', icon: <AlertCircle size={12} /> },
  Disconnected: { color: 'text-muted-foreground', bg: 'bg-muted/50', icon: <WifiOff size={12} /> },
};

const typeIcons: Record<string, React.ReactNode> = {
  ERP: <Database size={16} />,
  POS: <PlugZap size={16} />,
  Supplier: <Clock size={16} />,
  API: <RefreshCw size={16} />,
  Manual: <Database size={16} />,
};

export default function DataSourcesPage() {
  const { data: sources, loading, error, refetch } = useDataSources();
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const connectedCount = sources?.filter((s) => s.status === 'Connected').length ?? 0;
  const errorCount = sources?.filter((s) => s.status === 'Error').length ?? 0;
  const syncingCount = sources?.filter((s) => s.status === 'Syncing').length ?? 0;

  const handleRefresh = async (id: string) => {
    setRefreshingId(id);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setRefreshingId(null);
    refetch();
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setRemovingId(null);
    refetch();
  };

  return (
    <FeaturePageShell
      title="Data Sources"
      description="Connect, validate, and monitor every source that feeds the forecast and exception engine."
      badge={`${connectedCount} connected`}
      actions={
        <button className="btn-primary text-xs py-1.5" onClick={() => setShowAddForm(true)}>
          <Plus size={14} />
          Add data source
        </button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={`skel-ds-${i}`} className="rounded-2xl border border-border bg-card/70 p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                  <div className="h-6 w-20 bg-muted rounded-full" />
                </div>
              </div>
            ))
          ) : error ? (
            <div className="rounded-2xl border border-negative/30 bg-negative/5 p-6 text-center">
              <AlertCircle size={24} className="text-negative mx-auto mb-2" />
              <p className="text-sm text-negative font-medium">Failed to load data sources</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
              <button onClick={refetch} className="btn-secondary text-xs mt-3 py-1.5">Retry</button>
            </div>
          ) : sources && sources.length > 0 ? (
            sources.map((source) => {
              const cfg = statusConfig[source.status] || statusConfig.Disconnected;
              const isRemoving = removingId === source.id;
              return (
                <div
                  key={source.id}
                  className={`rounded-2xl border border-border bg-card/70 p-4 hover:bg-card transition-colors ${isRemoving ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-xl bg-primary/10 p-2 shrink-0">
                        {typeIcons[source.type] || <Database className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-semibold text-foreground truncate">{source.name}</h2>
                        <p className="text-sm text-muted-foreground">
                          {source.type} · {source.freshness} · Last sync {source.lastSync ? new Date(source.lastSync).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`rounded-full ${cfg.bg} px-2.5 py-1 text-xs font-medium ${cfg.color} flex items-center gap-1`}>
                        {refreshingId === source.id ? <Loader2 size={12} className="animate-spin" /> : cfg.icon}
                        {source.status}
                      </span>
                      <button
                        className="btn-ghost p-1.5 text-primary hover:text-foreground"
                        title="Refresh"
                        disabled={refreshingId === source.id}
                        onClick={() => handleRefresh(source.id)}
                      >
                        <RefreshCw size={14} className={refreshingId === source.id ? 'animate-spin' : ''} />
                      </button>
                      <button
                        className="btn-ghost p-1.5 text-muted-foreground hover:text-negative"
                        title="Remove source"
                        disabled={isRemoving}
                        onClick={() => handleRemove(source.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-border bg-card/70 p-8 text-center">
              <Database size={32} className="text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-medium text-foreground">No data sources configured</h3>
              <p className="text-xs text-muted-foreground mt-1">Add your first data source to start feeding the forecast engine.</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Pipeline health</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div className="rounded-xl bg-muted/60 p-3">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-positive" />
                  Data freshness is {errorCount > 0 ? 'degraded' : 'healthy'}
                </div>
                <p className="mt-1">
                  {errorCount > 0
                    ? `${errorCount} source(s) have errors and need attention.`
                    : syncingCount > 0
                      ? `${syncingCount} source(s) are currently syncing.`
                      : 'All connected sources are passing validation checks and updating on schedule.'}
                </p>
              </div>
              <div className="rounded-xl bg-muted/60 p-3">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <PlugZap className="h-4 w-4 text-primary" />
                  Integration status
                </div>
                <p className="mt-1">The next forecast run will consume the latest ERP and POS data without manual intervention.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card/70 p-4 text-center">
              <p className="text-2xl font-bold font-tabular text-foreground">{sources?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Sources</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/70 p-4 text-center">
              <p className="text-2xl font-bold font-tabular text-positive">{connectedCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Connected</p>
            </div>
          </div>
        </div>
      </div>

      <Modal open={showAddForm} onClose={() => setShowAddForm(false)} title="Add data source" size="md">
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Source name</label>
            <input type="text" className="input-field w-full" placeholder="e.g. ERP Sales" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Type</label>
            <select className="input-field w-full">
              <option>ERP</option>
              <option>POS</option>
              <option>Supplier</option>
              <option>API</option>
              <option>Manual</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary text-xs py-1.5" onClick={() => setShowAddForm(false)}>Cancel</button>
            <button className="btn-primary text-xs py-1.5" onClick={() => setShowAddForm(false)}>Connect</button>
          </div>
        </div>
      </Modal>
    </FeaturePageShell>
  );
}
