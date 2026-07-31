import React from 'react';
import { useDataMaturity } from '../lib/api-hooks';
import FeaturePageShell from '../components/FeaturePageShell';
import { Database, CalendarRange, Boxes, Layers, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

function ScoreRing({ score, size = 130 }: { score: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 75 ? 'var(--positive)' : score >= 50 ? 'var(--warning)' : 'var(--negative)';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold font-tabular text-foreground">{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

const statusStyles: Record<string, string> = {
  complete: 'text-positive',
  partial: 'text-warning',
  missing: 'text-negative',
};

const statusLabel: Record<string, string> = {
  complete: 'Available',
  partial: 'Partial',
  missing: 'Missing',
};

const importanceLabel: Record<string, string> = {
  essential: 'Essential',
  important: 'Important',
  nice: 'Nice to have',
};

const importanceBadge: Record<string, string> = {
  essential: 'bg-negative/10 text-negative border-negative/20',
  important: 'bg-warning/10 text-warning border-warning/20',
  nice: 'bg-muted text-muted-foreground border-border',
};

export default function DataMaturityPage() {
  const { data, loading, error } = useDataMaturity();

  return (
    <FeaturePageShell
      title="Data Maturity Assessment"
      description="What your data covers versus what we need for forecasting — and the gap between them."
      badge={data ? data.level : undefined}
      actions={
        <button
          onClick={() => window.location.reload()}
          className="btn-secondary text-xs py-1.5"
        >
          <Database size={13} /> Refresh assessment
        </button>
      }
    >
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-negative/30 bg-negative/5 p-6 text-center">
          <p className="text-sm text-negative font-medium">Failed to load data maturity</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Score + dataset summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="glass-card p-6 flex items-center gap-6">
              <ScoreRing score={data.overallScore} />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Data Maturity Level</p>
                <p className="text-xl font-semibold text-foreground mt-1">{data.level}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{data.summary}</p>
              </div>
            </div>

            <div className="glass-card p-5 lg:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Database size={15} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground">What you have</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-muted-foreground">File</p>
                  <p className="font-medium text-foreground mt-0.5 truncate" title={data.datasetSummary.filename}>{data.datasetSummary.filename || '—'}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-muted-foreground">Rows</p>
                  <p className="font-medium text-foreground mt-0.5 font-tabular">{data.datasetSummary.rows?.toLocaleString() ?? '—'}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-muted-foreground">Granularity / History</p>
                  <p className="font-medium text-foreground mt-0.5 capitalize">{data.datasetSummary.granularity || '—'} · {data.datasetSummary.nWeeks || 0} weeks</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-muted-foreground">Entities / Date range</p>
                  <p className="font-medium text-foreground mt-0.5 font-tabular">{data.datasetSummary.entities?.toLocaleString() ?? '—'} · {data.datasetSummary.dateFrom ? `${data.datasetSummary.dateFrom} → ${data.datasetSummary.dateTo}` : '—'}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(data.datasetSummary.columns || []).map((col) => (
                  <span key={col} className="rounded-full bg-primary/5 border border-primary/20 px-2.5 py-0.5 text-[11px] text-foreground font-mono">{col}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Dimensions */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
              <Layers size={15} className="text-primary" />
              What we need vs. what you provide
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Each input is weighted by importance. Essential inputs matter most for the overall score.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.dimensions.map((dim) => (
                <div key={dim.id} className="glass-card p-4 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{dim.name}</p>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] mt-1 ${importanceBadge[dim.importance]}`}>
                        {importanceLabel[dim.importance]}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-lg font-bold font-tabular ${statusStyles[dim.status]}`}>{dim.score}</p>
                      <p className={`text-[10px] uppercase tracking-wider ${statusStyles[dim.status]}`}>{statusLabel[dim.status]}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        dim.status === 'complete' ? 'bg-positive' : dim.status === 'partial' ? 'bg-warning' : 'bg-negative'
                      }`}
                      style={{ width: `${dim.score}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed flex-1">{dim.evidence}</p>
                  <div className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground/80 border-t border-border pt-2">
                    {dim.status === 'complete' ? (
                      <CheckCircle2 size={13} className="text-positive shrink-0 mt-0.5" />
                    ) : dim.status === 'partial' ? (
                      <AlertTriangle size={13} className="text-warning shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={13} className="text-negative shrink-0 mt-0.5" />
                    )}
                    <span>{dim.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </FeaturePageShell>
  );
}
