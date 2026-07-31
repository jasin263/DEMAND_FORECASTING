import React from 'react';
import { useAnalyticsMaturity } from '../lib/api-hooks';
import FeaturePageShell from '../components/FeaturePageShell';
import { BarChart3, CheckCircle2, AlertTriangle, XCircle, Lightbulb, TrendingUp, Loader2 } from 'lucide-react';

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

const capStatusBadge: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  ready: { label: 'Ready', cls: 'bg-positive/10 text-positive border-positive/20', icon: <CheckCircle2 size={13} /> },
  partial: { label: 'Limited', cls: 'bg-warning/10 text-warning border-warning/20', icon: <AlertTriangle size={13} /> },
  blocked: { label: 'Blocked', cls: 'bg-negative/10 text-negative border-negative/20', icon: <XCircle size={13} /> },
};

const priorityBadge: Record<string, string> = {
  P1: 'bg-negative/10 text-negative border-negative/20',
  P2: 'bg-warning/10 text-warning border-warning/20',
  P3: 'bg-muted text-muted-foreground border-border',
};

export default function AnalyticsMaturityPage() {
  const { data, loading, error } = useAnalyticsMaturity();

  return (
    <FeaturePageShell
      title="Analytics Maturity Assessment"
      description="Which analytics capabilities your current data can power today, what the gap is, and how to close it."
      badge={data ? data.level : undefined}
      actions={
        <button onClick={() => window.location.reload()} className="btn-secondary text-xs py-1.5">
          <BarChart3 size={13} /> Refresh assessment
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
          <p className="text-sm text-negative font-medium">Failed to load analytics maturity</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="glass-card p-6 flex items-center gap-6">
              <ScoreRing score={data.overallScore} />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Analytics Readiness</p>
                <p className="text-xl font-semibold text-foreground mt-1">{data.level}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{data.summary}</p>
              </div>
            </div>

            <div className="glass-card p-5 lg:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={15} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Capabilities today</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-positive/5 border border-positive/20 p-4 text-center">
                  <p className="text-3xl font-bold font-tabular text-positive">{data.counts.ready}</p>
                  <p className="text-xs text-muted-foreground mt-1">Ready now</p>
                </div>
                <div className="rounded-xl bg-warning/5 border border-warning/20 p-4 text-center">
                  <p className="text-3xl font-bold font-tabular text-warning">{data.counts.partial}</p>
                  <p className="text-xs text-muted-foreground mt-1">Limited</p>
                </div>
                <div className="rounded-xl bg-negative/5 border border-negative/20 p-4 text-center">
                  <p className="text-3xl font-bold font-tabular text-negative">{data.counts.blocked}</p>
                  <p className="text-xs text-muted-foreground mt-1">Blocked by data</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Capability readiness is derived from the data maturity of the inputs each module requires.
              </p>
            </div>
          </div>

          {/* Capabilities */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
              <BarChart3 size={15} className="text-primary" />
              What we can deliver with your data
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Each analytics module lists the data it needs and whether that data is present.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.capabilities.map((cap) => {
                const badge = capStatusBadge[cap.status];
                return (
                  <div key={cap.id} className="glass-card p-4 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground leading-snug">{cap.name}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] shrink-0 ${badge.cls}`}>
                        {badge.icon} {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed flex-1">{cap.description}</p>
                    <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          cap.status === 'ready' ? 'bg-positive' : cap.status === 'partial' ? 'bg-warning' : 'bg-negative'
                        }`}
                        style={{ width: `${cap.score}%` }}
                      />
                    </div>
                    {cap.missingData.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Needs</p>
                        <div className="flex flex-wrap gap-1.5">
                          {cap.missingData.map((m) => (
                            <span key={m.dimension} className="rounded-full bg-negative/5 border border-negative/20 px-2 py-0.5 text-[11px] text-negative">
                              {m.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-[11px] text-positive flex items-center gap-1">
                        <CheckCircle2 size={12} /> All required data present
                      </p>
                    )}
                    <p className="mt-3 text-[11px] text-muted-foreground border-t border-border pt-2">{cap.value}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommendations */}
          {data.recommendations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                <Lightbulb size={15} className="text-primary" />
                Recommended actions to close the gap
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Prioritized by impact on unlocking new analytics capabilities.
              </p>
              <div className="space-y-3">
                {data.recommendations.map((rec) => (
                  <div key={rec.id} className="glass-card p-4 flex flex-col md:flex-row md:items-start gap-3">
                    <div className="md:w-10 shrink-0 flex items-center gap-2">
                      <span className={`inline-flex rounded-lg border px-2 py-1 text-[10px] font-bold font-tabular ${priorityBadge[rec.priority]}`}>
                        {rec.priority}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{rec.title}</p>
                        <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px]">
                          Unlocks: {rec.unlocks}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{rec.action}</p>
                      {rec.example && (
                        <p className="text-[11px] text-muted-foreground/80 mt-1 font-mono">Example: {rec.example}</p>
                      )}
                    </div>
                    <div className="md:w-44 shrink-0 text-xs md:text-right">
                      <p className="text-muted-foreground">
                        Impact: <span className="text-foreground font-medium">{rec.impact}</span>
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        Effort: <span className="text-foreground font-medium">{rec.effort}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </FeaturePageShell>
  );
}
