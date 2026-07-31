'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Badge from '@/components/ui/Badge';
import { ChartSkeleton } from '@/components/ui/LoadingSkeleton';

const SKUForecastChart = dynamic(() => import('./SKUForecastChart'), {
  ssr: false,
  loading: () => <ChartSkeleton height={200} />,
});

interface SKUDetailModalProps {
  sku: {
    id: string;
    skuId: string;
    name: string;
    category: string;
    location: string;
    mape: number;
    bias: number;
    p50Forecast: number;
    reorderQty: number;
    safetyStock: number;
    model: string;
    pattern: string;
    lastActual: number;
  };
}

const backtestData = [
  { run: 'Run 1 (Apr)', mape: 16.2, wape: 13.1 },
  { run: 'Run 2 (May)', mape: 18.9, wape: 15.4 },
  { run: 'Run 3 (Jun)', mape: 22.4, wape: 18.2 },
  { run: 'Run 4 (Jul)', mape: 38.2, wape: 31.7 },
];

export default function SKUDetailModal({ sku }: SKUDetailModalProps) {
  return (
    <div className="p-5 space-y-5">
      {/* Metadata row */}
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

      {/* KPIs */}
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

      {/* Forecast chart */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Forecast vs Actuals — Last 8 Weeks</h3>
        <SKUForecastChart skuId={sku.id} />
      </div>

      {/* Backtest history */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Backtest Accuracy History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="table-header-cell">Run</th>
                <th className="table-header-cell">MAPE</th>
                <th className="table-header-cell">WAPE</th>
                <th className="table-header-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {backtestData.map((row) => (
                <tr key={`bt-${row.run}`} className="table-row-hover">
                  <td className="table-cell">{row.run}</td>
                  <td className="table-cell font-tabular">{row.mape}%</td>
                  <td className="table-cell font-tabular">{row.wape}%</td>
                  <td className="table-cell">
                    <Badge variant={row.mape > 25 ? 'negative' : row.mape > 15 ? 'warning' : 'positive'}>
                      {row.mape > 25 ? 'Poor' : row.mape > 15 ? 'Fair' : 'Good'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}