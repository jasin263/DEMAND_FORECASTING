import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExceptions, useBulkResolveExceptions } from '../lib/api-hooks';
import { apiPost } from '../lib/api-client';
import { AlertTriangle, CheckCircle2, Clock, Download, Loader2, XCircle, Eye, EyeOff } from 'lucide-react';
import FeaturePageShell from '../components/FeaturePageShell';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';

const severityColors: Record<string, 'negative' | 'warning' | 'info'> = {
  high: 'negative',
  medium: 'warning',
  low: 'info',
};

const statusColors: Record<string, 'negative' | 'warning' | 'info' | 'positive'> = {
  open: 'warning',
  acknowledged: 'info',
  resolved: 'positive',
  dismissed: 'negative',
};

export default function ExceptionsPage() {
  const navigate = useNavigate();
  const { data: exceptions, loading, error, refetch } = useExceptions({ limit: 50 });
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { execute: resolveExceptions } = useBulkResolveExceptions();
  const [exporting, setExporting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveNote, setResolveNote] = useState('');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const filteredByStatus = statusFilter === 'all'
    ? exceptions
    : exceptions?.filter((e) => (e.status || 'open').toLowerCase() === statusFilter);

  const filtered = severityFilter === 'all'
    ? filteredByStatus
    : filteredByStatus?.filter((e) => e.severity?.toLowerCase() === severityFilter);

  const allIds = filtered?.map((e) => e.id) ?? [];
  const openCount = exceptions?.filter((e) => (e.status || 'open') === 'open').length ?? 0;
  const totalOpen = exceptions?.length ?? 0;

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

  const handleBulkAction = async () => {
    setResolving(true);
    setFeedbackError(null);
    try {
      await resolveExceptions(Array.from(selected), 'resolve', resolveNote || undefined);
      setSelected(new Set());
      setShowResolveModal(false);
      setResolveNote('');
      refetch();
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'Failed to resolve exceptions.');
    } finally {
      setResolving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await apiPost('/exceptions/export', {});
    } catch {
      // Silently handled
    }
    setExporting(false);
  };

  return (
    <FeaturePageShell
      title="Exceptions & Alerts"
      description="Watch critical supply and forecast anomalies, triage them, and keep stakeholders aligned with automated actions."
      badge={`${openCount} open`}
      actions={
        <>
          <button
            className="btn-secondary text-xs py-1.5"
            disabled={selected.size === 0 || exporting}
            onClick={handleExport}
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export
          </button>
          <button
            className="btn-primary text-xs py-1.5"
            disabled={selected.size === 0 || resolving}
            onClick={() => setShowResolveModal(true)}
          >
            {resolving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Resolve ({selected.size})
          </button>
        </>
      }
    >
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {['all', 'high', 'medium', 'low'].map((t) => (
            <button
              key={t}
              onClick={() => { setSeverityFilter(t); setSelected(new Set()); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                severityFilter === t
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => { setStatusFilter('open'); setSelected(new Set()); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'open'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye size={12} className="inline mr-1" />Open
          </button>
          <button
            onClick={() => { setStatusFilter('all'); setSelected(new Set()); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'all'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <EyeOff size={12} className="inline mr-1" />All ({totalOpen})
          </button>
        </div>
        <span className="text-xs text-muted-foreground self-center ml-auto">
          {selected.size > 0 ? `${selected.size} selected` : ''}
        </span>
      </div>

      {/* Error feedback */}
      {feedbackError && (
        <div className="mb-4 rounded-xl border border-negative/30 bg-negative/5 p-3 flex items-center gap-2 text-sm text-negative">
          <AlertTriangle size={16} />
          {feedbackError}
          <button onClick={() => setFeedbackError(null)} className="ml-auto text-negative/70 hover:text-negative">
            <XCircle size={14} />
          </button>
        </div>
      )}

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
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={selected.size === allIds.length && allIds.length > 0}
                onChange={toggleAll}
                className="rounded border-border text-primary focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground">Select all</span>
            </div>
          ) : null}

          {filtered && filtered.length > 0 ? (
            filtered.map((item) => {
              const status = (item.status || 'open').toLowerCase();
              const isClosed = status === 'resolved' || status === 'dismissed';
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 transition-colors cursor-pointer ${
                    isClosed ? 'opacity-50' : ''
                  } ${
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
                        {isClosed ? (
                          <CheckCircle2 className="h-4 w-4 text-positive shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                        )}
                        <h2 className="font-semibold text-foreground truncate">{item.name || item.skuId}</h2>
                      </div>
                      {item.type && (
                        <p className="mt-1 text-xs text-muted-foreground ml-8 capitalize">
                          {item.type === 'high-mape' ? 'High MAPE' : item.type === 'stockout-risk' ? 'Stockout Risk' : item.type === 'demand-drop' ? 'Demand Drop' : 'Demand Spike'}
                          {item.mape != null && ` · MAPE: ${item.mape}%`}
                          {item.daysToStockout != null && ` · ${item.daysToStockout} days to stockout`}
                          {item.spikeMultiple != null && ` · ${item.spikeMultiple}x spike`}
                          {item.dropRatio != null && ` · ${Math.round((1 - item.dropRatio) * 100)}% below baseline`}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-muted-foreground ml-8">
                        {item.category && `Category: ${item.category}`}
                        {item.location && `${item.category ? ' · ' : ''}Location: ${item.location}`}
                      </p>
                      {item.note && (
                        <p className="mt-1 text-xs text-muted-foreground/70 ml-8 italic">
                          Note: {item.note}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={statusColors[status] || 'warning'}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                      <Badge variant={severityColors[item.severity?.toLowerCase() || 'medium']}>
                        {item.severity || 'Medium'}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground ml-8">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Recent'}
                    </span>
                    <div className="flex items-center gap-3">
                      {!isClosed && (
                        <>
                          <button
                            className="text-xs font-medium text-positive hover:underline"
                            onClick={(e) => { e.stopPropagation(); setSelected(new Set([item.id])); setShowResolveModal(true); }}
                          >
                            Resolve
                          </button>
                          <button
                            className="text-xs font-medium text-info hover:underline"
                            onClick={(e) => { e.stopPropagation(); (async () => { try { await resolveExceptions([item.id], 'acknowledge'); refetch(); } catch (err) { setFeedbackError(err instanceof Error ? err.message : 'Failed to acknowledge.'); } })(); }}
                          >
                            Acknowledge
                          </button>
                          <button
                            className="text-xs font-medium text-muted-foreground hover:underline"
                            onClick={(e) => { e.stopPropagation(); (async () => { try { await resolveExceptions([item.id], 'dismiss'); refetch(); } catch (err) { setFeedbackError(err instanceof Error ? err.message : 'Failed to dismiss.'); } })(); }}
                          >
                            Dismiss
                          </button>
                        </>
                      )}
                      <button
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={(e) => { e.stopPropagation(); navigate(`/skus/${item.sku}`); }}
                      >
                        Investigate
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : !loading && !error ? (
            <div className="rounded-2xl border border-border bg-card/70 p-8 text-center">
              <CheckCircle2 size={32} className="text-positive mx-auto mb-3" />
              <h3 className="text-sm font-medium text-foreground">
                {statusFilter === 'open' ? 'All clear!' : 'No matching exceptions'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {statusFilter === 'open'
                  ? 'All exceptions have been resolved.'
                  : 'No exceptions match the current filter.'}
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
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
              const count = exceptions?.filter((e) => e.severity?.toLowerCase() === sev.toLowerCase()).length ?? 0;
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

      <Modal open={showResolveModal} onClose={() => setShowResolveModal(false)} title="Resolve Exceptions">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Resolve {selected.size} selected exception{selected.size > 1 ? 's' : ''}? This action cannot be undone.
          </p>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Resolution note (optional)</label>
            <textarea
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              className="input-field w-full min-h-[80px]"
              placeholder="Explain the root cause or corrective action..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary text-xs py-1.5" onClick={() => setShowResolveModal(false)}>Cancel</button>
            <button
              className="btn-primary text-xs py-1.5"
              disabled={resolving}
              onClick={handleBulkAction}
            >
              {resolving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Resolve
            </button>
          </div>
        </div>
      </Modal>
    </FeaturePageShell>
  );
}
