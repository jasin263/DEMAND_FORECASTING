import React, { useEffect, useState } from 'react';
import { AlertTriangle, PackageX, Zap, TrendingDown, Loader2 } from 'lucide-react';
import Badge from './ui/Badge';
import { useNavigate } from 'react-router-dom';
import { useExceptions } from '../lib/api-hooks';
import type { ExceptionItem } from '../lib/api-types';
import { buildWorkspaceExceptions, readWorkspaceForecastRun } from '../lib/workspace-forecast';

const iconMap: Record<string, React.ReactNode> = {
  'high-mape': <AlertTriangle size={14} className="text-negative" />,
  'stockout-risk': <PackageX size={14} className="text-warning" />,
  'demand-spike': <Zap size={14} className="text-accent" />,
  'demand-drop': <TrendingDown size={14} className="text-info" />,
};

const badgeMap: Record<string, React.ReactNode> = {
  'high-mape': <Badge variant="negative">High MAPE</Badge>,
  'stockout-risk': <Badge variant="warning">Stockout Risk</Badge>,
  'demand-spike': <Badge variant="info">Demand Spike</Badge>,
  'demand-drop': <Badge variant="info">Demand Drop</Badge>,
};

export default function ExceptionPanel() {
  const navigate = useNavigate();
  const { data: exceptions, loading: apiLoading } = useExceptions({ limit: 7 });
  const [workspaceExceptions, setWorkspaceExceptions] = useState<ExceptionItem[]>([]);

  useEffect(() => {
    const run = readWorkspaceForecastRun();
    setWorkspaceExceptions(buildWorkspaceExceptions(run));
  }, []);

  const workspaceMode = workspaceExceptions.length > 0;
  const loading = workspaceMode ? false : apiLoading;
  const visibleExceptions = workspaceMode ? workspaceExceptions : (exceptions ?? []);

  return (
    <div className="glass-card h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-warning" />
          <h2 className="text-sm font-semibold text-foreground">Exceptions</h2>
          <span className="status-badge bg-warning/10 text-warning border border-warning/20 font-tabular">
            {loading ? '...' : visibleExceptions.length}
          </span>
        </div>
        <button onClick={() => navigate('/exceptions')} className="text-xs text-primary hover:underline">
          View all
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-border">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        ) : visibleExceptions.length > 0 ? (
          visibleExceptions.map((exc) => (
            <div key={exc.id} className="px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => navigate(`/skus/${exc.sku}`)}>
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">{iconMap[exc.type || ''] || <AlertTriangle size={14} className="text-muted-foreground" />}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{exc.name}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{exc.skuId}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {badgeMap[exc.type || '']}
                    {exc.type === 'high-mape' && exc.mape != null && (
                      <span className="text-xs text-negative font-tabular font-medium">{exc.mape}%</span>
                    )}
                    {exc.type === 'stockout-risk' && exc.daysToStockout != null && (
                      <span className="text-xs text-warning font-medium">{exc.daysToStockout}d left</span>
                    )}
                    {exc.type === 'demand-spike' && exc.spikeMultiple != null && (
                      <span className="text-xs text-accent font-medium">{exc.spikeMultiple}× avg</span>
                    )}
                    {exc.type === 'demand-drop' && exc.dropRatio != null && (
                      <span className="text-xs text-info font-medium">{Math.round((1 - exc.dropRatio) * 100)}% below baseline</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-xs text-muted-foreground">
            <p>No active exceptions</p>
          </div>
        )}
      </div>
      <div className="px-4 py-3 border-t border-border">
        <button onClick={() => navigate('/exceptions')} className="btn-secondary w-full text-xs py-1.5 justify-center">
          View All Exceptions
        </button>
      </div>
    </div>
  );
}
