import React from 'react';
import { AlertTriangle, PackageX, Zap, Loader2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useExceptions } from '@/lib/api-hooks';

const iconMap = {
  mape: <AlertTriangle size={14} className="text-negative" />,
  stockout: <PackageX size={14} className="text-warning" />,
  spike: <Zap size={14} className="text-accent" />,
};

const badgeMap = {
  'high-mape': <Badge variant="negative">High MAPE</Badge>,
  'stockout-risk': <Badge variant="warning">Stockout Risk</Badge>,
  'demand-spike': <Badge variant="info">Demand Spike</Badge>,
};

export default function ExceptionPanel() {
  const router = useRouter();
  const { data: exceptions, loading, error, refetch } = useExceptions({ limit: 8 });

  if (loading) {
    return (
      <div className="glass-card h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-warning" />
            <h2 className="text-sm font-semibold text-foreground">Exceptions</h2>
            <span className="status-badge bg-warning/10 text-warning border border-warning/20 font-tabular">...</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`skel-exc-panel-${i}`} className="px-4 py-3 animate-pulse">
              <div className="space-y-2">
                <div className="h-3 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-warning" />
            <h2 className="text-sm font-semibold text-foreground">Exceptions</h2>
          </div>
          <button onClick={refetch} className="text-xs text-primary hover:underline">Retry</button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <AlertTriangle size={24} className="text-negative mx-auto mb-2" />
            <p className="text-xs text-negative font-medium">Failed to load</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const iconForType = (type: string) => {
    if (type === 'high-mape') return iconMap.mape;
    if (type === 'stockout-risk') return iconMap.stockout;
    return iconMap.spike;
  };

  return (
    <div className="glass-card h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-warning" />
          <h2 className="text-sm font-semibold text-foreground">Exceptions</h2>
          <span className="status-badge bg-warning/10 text-warning border border-warning/20 font-tabular">
            {exceptions?.length ?? 0}
          </span>
        </div>
        <Link href="/exceptions" className="text-xs text-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-border">
        {exceptions?.map((exc) => (
          <div
            key={exc.id}
            className="px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
            onClick={() => router.push(`/skus/${exc.sku}`)}
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 shrink-0">{iconForType(exc.type)}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">{exc.name}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{exc.skuId}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {badgeMap[exc.type as keyof typeof badgeMap]}
                  {exc.type === 'high-mape' && exc.mape != null && (
                    <span className="text-xs text-negative font-tabular font-medium">{exc.mape}%</span>
                  )}
                  {exc.type === 'stockout-risk' && exc.daysToStockout != null && (
                    <span className="text-xs text-warning font-medium">{exc.daysToStockout}d left</span>
                  )}
                  {exc.type === 'demand-spike' && exc.spikeMultiple != null && (
                    <span className="text-xs text-accent font-medium">{exc.spikeMultiple}× avg</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-border">
        <button className="btn-secondary w-full text-xs py-1.5 justify-center">
          Resolve All Exceptions
        </button>
      </div>
    </div>
  );
}