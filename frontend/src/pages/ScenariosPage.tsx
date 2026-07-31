import React, { useState, useMemo } from 'react';
import FeaturePageShell from '../components/FeaturePageShell';
import { TrendingUp, Zap, ShieldCheck, Plus, AlertTriangle, ArrowLeftRight, Loader2 } from 'lucide-react';
import { useScenarios } from '../lib/api-hooks';
import { apiPost } from '../lib/api-client';

const impactColors: Record<string, string> = {
  active: 'bg-positive/10 text-positive',
  draft: 'bg-muted text-muted-foreground',
  archived: 'bg-negative/10 text-negative',
};

export default function ScenariosPage() {
  const { data: scenarios, loading, error, refetch } = useScenarios();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [comparingIds, setComparingIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const selectedScenarios = useMemo(() => {
    if (!scenarios) return [];
    return scenarios.filter((s) => comparingIds.has(s.id));
  }, [scenarios, comparingIds]);

  const toggleCompare = (id: string) => {
    const next = new Set(comparingIds);
    if (next.has(id)) {
      next.delete(id);
    } else if (next.size < 2) {
      next.add(id);
    }
    setComparingIds(next);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await apiPost('/scenarios', { title: 'New Scenario', detail: '', impact: '', status: 'draft' });
      setShowCreateModal(false);
      refetch();
    } catch {
      // Backend handles creation
    }
    setCreating(false);
  };

  return (
    <FeaturePageShell
      title="What-If Scenarios"
      description="Explore business scenarios before you commit to a plan and compare the impact on service, cost, and inventory."
      badge={scenarios ? `${scenarios.length} scenarios` : 'Scenario planner'}
      actions={
        <>
          <button className="btn-secondary text-xs py-1.5" disabled={comparingIds.size < 2}>
            <ArrowLeftRight size={14} />
            Compare ({comparingIds.size})
          </button>
          <button className="btn-primary text-xs py-1.5" onClick={() => setShowCreateModal(true)}>
            <Plus size={14} />
            Create scenario
          </button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={`skel-sc-${i}`} className="rounded-2xl border border-border bg-card/70 p-4 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-6 w-20 bg-muted rounded-full mt-2" />
                </div>
              </div>
            ))
          ) : error ? (
            <div className="rounded-2xl border border-negative/30 bg-negative/5 p-6 text-center">
              <AlertTriangle size={24} className="text-negative mx-auto mb-2" />
              <p className="text-sm text-negative font-medium">Failed to load scenarios</p>
              <button onClick={refetch} className="btn-secondary text-xs mt-3 py-1.5">Retry</button>
            </div>
          ) : scenarios && scenarios.length > 0 ? (
            scenarios.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 transition-colors cursor-pointer ${
                  comparingIds.has(item.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card/70 hover:bg-card'
                }`}
                onClick={() => toggleCompare(item.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={comparingIds.has(item.id)}
                        onChange={() => toggleCompare(item.id)}
                        className="rounded border-border text-primary focus:ring-ring shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <h2 className="font-semibold text-foreground truncate">{item.title}</h2>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground ml-8">{item.detail}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${impactColors[item.status] || impactColors.draft}`}>
                      {item.impact}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-border bg-card/70 p-8 text-center">
              <Zap size={32} className="text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-medium text-foreground">No scenarios yet</h3>
              <p className="text-xs text-muted-foreground mt-1">Create your first what-if scenario to test different business assumptions.</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Scenario summary</h2>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-muted/60 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <TrendingUp className="h-4 w-4 text-positive" />
                  Expected service improvement
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Service level is projected to increase by 3.2 points with the current buffer strategy.</p>
              </div>
              <div className="rounded-xl bg-muted/60 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Inventory resilience
                </div>
                <p className="mt-1 text-sm text-muted-foreground">The recommended safety stock keeps 91% of the portfolio protected under a supply disruption.</p>
              </div>
            </div>
          </div>

          {selectedScenarios.length === 2 && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Comparison: {selectedScenarios[0].title} vs {selectedScenarios[1].title}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted/60 p-2 text-center">
                  <p className="text-xs text-muted-foreground">Revenue Impact</p>
                  <p className="font-semibold text-foreground">{selectedScenarios[0].impact}</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-2 text-center">
                  <p className="text-xs text-muted-foreground">Revenue Impact</p>
                  <p className="font-semibold text-foreground">{selectedScenarios[1].impact}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5">
            <h2 className="font-semibold text-foreground mb-4">Create scenario</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Scenario title</label>
                <input type="text" className="input-field w-full" placeholder="e.g. Promotional uplift" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Detail</label>
                <textarea className="input-field w-full" rows={3} placeholder="Describe the business assumptions..." />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button className="btn-secondary text-xs py-1.5" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button className="btn-primary text-xs py-1.5" disabled={creating} onClick={handleCreate}>
                  {creating && <Loader2 size={14} className="animate-spin" />}
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </FeaturePageShell>
  );
}

