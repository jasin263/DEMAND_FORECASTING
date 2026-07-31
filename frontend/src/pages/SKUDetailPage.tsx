import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSKUDetail } from '../lib/api-hooks';
import FeaturePageShell from '../components/FeaturePageShell';
import SKUForecastChart from '../components/SKUForecastChart';
import { ArrowLeft, TrendingUp, AlertTriangle, Clock, Loader2, BarChart3, Package, MapPin, Activity, Database, LineChart } from 'lucide-react';

export default function SKUDetailPage() {
  const { skuId } = useParams<{ skuId: string }>();
  const navigate = useNavigate();
  const { data: sku, loading, error } = useSKUDetail(skuId || '');

  const patternColors: Record<string, string> = {
    Smooth: 'bg-positive/10 text-positive',
    Seasonal: 'bg-accent/10 text-accent',
    Intermittent: 'bg-warning/10 text-warning',
    Erratic: 'bg-negative/10 text-negative',
  };

  return (
    <FeaturePageShell
      title={sku ? sku.name : 'SKU Detail'}
      description={sku ? `${sku.skuId} · ${sku.category} · ${sku.location}` : 'Loading...'}
      badge={sku ? sku.model : undefined}
      actions={
        <button onClick={() => navigate(-1)} className="btn-secondary text-xs py-1.5">
          <ArrowLeft size={14} />
          Back
        </button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-negative/30 bg-negative/5 p-6 text-center">
          <AlertTriangle size={24} className="text-negative mx-auto mb-2" />
          <p className="text-sm text-negative font-medium">Failed to load SKU details</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      ) : sku ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard icon={Activity} label="MAPE" value={`${sku.mape}%`} />
            <MetricCard icon={BarChart3} label="Forecast Bias" value={`${sku.bias}%`} />
            <MetricCard icon={LineChart} label="P50 Forecast" value={sku.p50Forecast.toLocaleString()} />
            <MetricCard icon={Package} label="Reorder Qty" value={sku.reorderQty.toLocaleString()} />
            <MetricCard icon={Package} label="Safety Stock" value={sku.safetyStock.toLocaleString()} />
            <MetricCard icon={TrendingUp} label="Last Actual" value={sku.lastActual.toLocaleString()} />
            <MetricCard icon={Database} label="Model" value={sku.model} />
            <MetricCard icon={MapPin} label="Location" value={sku.location.split('(')[0].trim()} />
          </div>

          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <LineChart size={16} />
              Forecast vs Actuals - Last 52 Weeks + 12-Week Forecast
            </h2>
            <SKUForecastChart fullTrend={sku.fullTrend} forecast={sku.forecast} />
          </div>

          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock size={16} />
              Backtest History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-medium text-muted-foreground">Run</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">MAPE</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">WAPE</th>
                  </tr>
                </thead>
                <tbody>
                  {sku.backtestHistory.map((bt, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-2 text-foreground">{bt.run}</td>
                      <td className={`py-2 text-right font-tabular ${bt.mape > 30 ? 'text-negative' : bt.mape > 15 ? 'text-warning' : 'text-positive'}`}>{bt.mape.toFixed(1)}%</td>
                      <td className={`py-2 text-right font-tabular ${bt.wape > 25 ? 'text-negative' : bt.wape > 12 ? 'text-warning' : 'text-positive'}`}>{bt.wape.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </FeaturePageShell>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
        <Icon size={14} />
        {label}
      </div>
      <p className="text-lg font-semibold text-foreground font-tabular">{value}</p>
    </div>
  );
}
