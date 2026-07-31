import React from 'react';
import Badge from './ui/Badge';
import SKUForecastChart from './SKUForecastChart';
import { useSKUDetail } from '../lib/api-hooks';
import { Loader2, AlertTriangle, TrendingUp } from 'lucide-react';

export default function SKUDetailModal({ skuId }: { skuId: string }) {
  const { data: sku, loading, error, refetch } = useSKUDetail(skuId);

  if (loading) {
    return (
      <div className="p-5 flex items-center justify-center min-h-[200px]">
        <Loader2 size={20} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !sku) {
    return (
      <div className="p-5 text-center">
        <AlertTriangle size={20} className="text-negative mx-auto mb-2" />
        <p className="text-sm text-negative font-medium">Failed to load SKU detail</p>
        <button onClick={refetch} className="btn-secondary text-xs mt-2 py-1.5">Retry</button>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Category', value: sku.category },
          { label: 'Location', value: sku.location },
          { label: 'Model Used', value: sku.model },
          { label: 'Demand Pattern', value: sku.pattern },
        ].map((item) => (
          <div key={`meta-${item.label}`} className="bg-muted rounded-lg p-3">
            <p className="label-text">{item.label}</p>
            <p className="text-sm font-medium text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-muted rounded-lg p-3">
          <p className="label-text">MAPE</p>
          <p className={`text-xl font-bold font-tabular ${sku.mape > 25 ? 'text-negative' : sku.mape > 15 ? 'text-warning' : 'text-positive'}`}>
            {sku.mape}%
          </p>
        </div>
        <div className="bg-muted rounded-lg p-3">
          <p className="label-text">Forecast Bias</p>
          <p className="text-xl font-bold font-tabular text-foreground">
            {sku.bias > 0 ? '+' : ''}{sku.bias}%
          </p>
        </div>
        <div className="bg-muted rounded-lg p-3">
          <p className="label-text">P50 Forecast (12w)</p>
          <p className="text-xl font-bold font-tabular text-foreground">
            {sku.p50Forecast.toLocaleString()}
          </p>
        </div>
        <div className="bg-muted rounded-lg p-3">
          <p className="label-text">Recommended Reorder</p>
          <p className="text-xl font-bold font-tabular text-accent">
            {sku.reorderQty.toLocaleString()}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
          <TrendingUp size={14} />
          Forecast vs Actuals - Last 52 Weeks + 12-Week Forecast
        </h3>
        <SKUForecastChart fullTrend={sku.fullTrend} forecast={sku.forecast} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Backtest Accuracy History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Run</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">MAPE</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">WAPE</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {(sku.backtestHistory ?? []).length > 0 ? (
                sku.backtestHistory.map((row, i) => (
                  <tr key={`bt-${i}`} className="border-b border-border/50 transition-colors hover:bg-muted/20">
                    <td className="px-3 py-2 text-foreground">{row.run}</td>
                    <td className="px-3 py-2 font-tabular">{row.mape}%</td>
                    <td className="px-3 py-2 font-tabular">{row.wape}%</td>
                    <td className="px-3 py-2">
                      <Badge variant={row.mape > 25 ? 'negative' : row.mape > 15 ? 'warning' : 'positive'}>
                        {row.mape > 25 ? 'Poor' : row.mape > 15 ? 'Fair' : 'Good'}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                    No backtest history available for this SKU.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
