'use client';

import React, { useState } from 'react';
import FeaturePageShell from '../components/FeaturePageShell';
import { Download, ArrowRightLeft, ShieldCheck, FileText, FileSpreadsheet, FileJson, Clock, CheckCircle2, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { useExportPackages } from '@/lib/api-hooks';
import type { ExportPackage } from '@/lib/api-types';

const formatIcons: Record<string, React.ReactNode> = {
  CSV: <FileText size={16} />,
  XLSX: <FileSpreadsheet size={16} />,
  JSON: <FileJson size={16} />,
};

const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  ready: { color: 'text-positive', bg: 'bg-positive/10', icon: <CheckCircle2 size={12} /> },
  generating: { color: 'text-accent', bg: 'bg-accent/10', icon: <RefreshCw size={12} className="animate-spin" /> },
  failed: { color: 'text-negative', bg: 'bg-negative/10', icon: <AlertCircle size={12} /> },
};

const integrations = [
  { name: 'ERP API', status: 'Connected', icon: <ArrowRightLeft size={16} /> },
  { name: 'Slack Alerts', status: 'Enabled', icon: <Download size={16} /> },
  { name: 'Power BI', status: 'Scheduled refresh', icon: <RefreshCw size={16} /> },
  { name: 'Webhook', status: 'Configured', icon: <Clock size={16} /> },
];

export default function ExportPage() {
  const { data, loading, error, refetch } = useExportPackages();
  const packages = data?.packages ?? [];
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [publishing, setPublishing] = useState(false);

  const filtered = selectedFormat === 'all' ? packages : packages.filter((p) => p.format === selectedFormat);
  const readyCount = packages.filter((p) => p.status === 'ready').length;

  const handlePublish = async () => {
    setPublishing(true);
    await new Promise((resolve) => setTimeout(resolve, 1600));
    setPublishing(false);
    refetch();
  };

  const handleDownload = async (id: string) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  return (
    <FeaturePageShell
      title="Export / Integrate"
      description="Ship forecast outputs and operational insights into your downstream systems with reusable integrations."
      badge={`${readyCount} ready`}
      actions={
        <>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {['all', 'CSV', 'XLSX', 'JSON'].map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedFormat === fmt
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {fmt === 'all' ? 'All' : fmt}
              </button>
            ))}
          </div>
          <button className="btn-primary text-xs py-1.5" disabled={publishing} onClick={handlePublish}>
            {publishing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Publish package
          </button>
        </>
      }
    >
      {error ? (
        <div className="rounded-2xl border border-negative/30 bg-negative/5 p-6 text-center">
          <AlertCircle size={24} className="text-negative mx-auto mb-2" />
          <p className="text-sm text-negative font-medium">Failed to load export packages</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
          <button onClick={refetch} className="btn-secondary text-xs mt-3 py-1.5">Retry</button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={`skel-exp-${i}`} className="rounded-2xl border border-border bg-card/70 p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-40 bg-muted rounded" />
                        <div className="h-3 w-24 bg-muted rounded" />
                      </div>
                      <div className="h-6 w-24 bg-muted rounded-full" />
                    </div>
                  </div>
                ))
              : filtered.map((pkg) => {
                  const cfg = statusConfig[pkg.status] || statusConfig.ready;
                  return (
                    <div key={pkg.id} className="rounded-2xl border border-border bg-card/70 p-4 hover:bg-card transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="rounded-xl bg-primary/10 p-2 shrink-0">
                            {formatIcons[pkg.format] || <FileText size={16} className="text-primary" />}
                          </div>
                          <div className="min-w-0">
                            <h2 className="font-semibold text-foreground truncate">{pkg.name}</h2>
                            <p className="text-sm text-muted-foreground">
                              {pkg.format} · {pkg.size} · Updated {new Date(pkg.updatedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`rounded-full ${cfg.bg} px-2.5 py-1 text-xs font-medium ${cfg.color} flex items-center gap-1`}>
                            {cfg.icon}
                            {pkg.status === 'ready' ? 'Ready' : pkg.status === 'generating' ? 'Generating' : 'Failed'}
                          </span>
                          <button
                            className="btn-ghost p-1.5"
                            disabled={pkg.status !== 'ready'}
                            title="Download"
                            onClick={() => handleDownload(pkg.id)}
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card/70 p-5">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">Integration channels</h2>
              </div>
              <div className="mt-4 space-y-2">
                {integrations.map((int) => (
                  <div key={int.name} className="rounded-xl bg-muted/60 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      {int.icon}
                      <span className="font-medium">{int.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{int.status}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-positive/20 bg-positive/10 p-3 text-sm text-foreground">
                <div className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="h-4 w-4 text-positive" />
                  Delivery status healthy
                </div>
                <p className="mt-1 text-muted-foreground">Exports are authenticated, compressed, and ready for downstream consumption.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-card/70 p-4 text-center">
                <p className="text-2xl font-bold font-tabular text-foreground">{readyCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Ready Exports</p>
              </div>
              <div className="rounded-2xl border border-border bg-card/70 p-4 text-center">
                <p className="text-2xl font-bold font-tabular text-foreground">{integrations.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Integrations</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </FeaturePageShell>
  );
}
