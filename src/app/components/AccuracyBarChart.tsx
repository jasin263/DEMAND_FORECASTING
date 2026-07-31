'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';

// Backend integration point: fetch /api/tenants/:tenantId/accuracy-by-category
const categoryData = [
  { category: 'Beverages', mape: 9.2, skus: 78 },
  { category: 'Dairy', mape: 13.1, skus: 54 },
  { category: 'Snacks', mape: 11.8, skus: 92 },
  { category: 'Personal Care', mape: 18.4, skus: 67 },
  { category: 'Frozen', mape: 22.7, skus: 31 },
  { category: 'Condiments', mape: 15.3, skus: 20 },
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: { skus: number } }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">MAPE</span>
        <span className="font-tabular text-foreground font-medium">{payload[0].value}%</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">SKUs</span>
        <span className="font-tabular text-foreground">{payload[0].payload.skus}</span>
      </div>
    </div>
  );
};

export default function AccuracyBarChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={categoryData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="category"
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={15} stroke="var(--warning)" strokeDasharray="4 4" label={{ value: 'Threshold 15%', position: 'right', fontSize: 10, fill: 'var(--warning)' }} />
        <Bar dataKey="mape" radius={[4, 4, 0, 0]} name="MAPE">
          {categoryData.map((entry, index) => (
            <Cell
              key={`bar-${entry.category}`}
              fill={entry.mape > 15 ? 'var(--negative)' : entry.mape > 12 ? 'var(--warning)' : 'var(--primary)'}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}