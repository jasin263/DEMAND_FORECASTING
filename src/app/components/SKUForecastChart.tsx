'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface CustomTooltipPayloadItem {
  name: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-2.5 shadow-xl text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <div key={`tt-${p.name}`} className="flex justify-between gap-4">
          <span className="text-muted-foreground">
            {p.name === 'actual' ? 'Actual' : p.name === 'p50' ? 'P50 Forecast' : p.name === 'p10' ? 'P10' : 'P90'}
          </span>
          <span className="font-tabular text-foreground">{p.value?.toLocaleString() ?? '\u2013'}</span>
        </div>
      ))}
    </div>
  );
};

export default function SKUForecastChart({
  fullTrend,
  forecast,
}: {
  fullTrend: number[];
  forecast?: { p50: number[]; p10: number[]; p90: number[] };
}) {
  const data = useMemo(() => {
    const points: { week: string; actual: number | null; p50: number | null; p10: number | null; p90: number | null }[] = [];

    const actualLen = fullTrend.length;
    const maxPts = 52;
    const startIdx = Math.max(0, actualLen - maxPts);

    for (let i = startIdx; i < actualLen; i++) {
      points.push({
        week: `W${i + 1}`,
        actual: fullTrend[i],
        p50: null,
        p10: null,
        p90: null,
      });
    }

    if (forecast) {
      const fcLen = forecast.p50.length;
      for (let i = 0; i < fcLen; i++) {
        points.push({
          week: `F${i + 1}`,
          actual: null,
          p50: forecast.p50[i],
          p10: forecast.p10?.[i] ?? null,
          p90: forecast.p90?.[i] ?? null,
        });
      }
    }

    return points;
  }, [fullTrend, forecast]);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={50} tickFormatter={(v: number) => v.toLocaleString()} />
        <Tooltip content={<CustomTooltip />} />
        {forecast && (
          <>
            <defs>
              <linearGradient id="p10p90Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--forecast-line)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--forecast-line)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="p90" stroke="none" fill="url(#p10p90Grad)" name="p90" />
            <Area type="monotone" dataKey="p10" stroke="none" fill="url(#p10p90Grad)" name="p10" />
          </>
        )}
        <Line type="monotone" dataKey="actual" stroke="var(--actual-line)" strokeWidth={2} dot={{ fill: 'var(--actual-line)', r: 2 }} name="actual" connectNulls={false} />
        <Line type="monotone" dataKey="p50" stroke="var(--forecast-line)" strokeWidth={2} strokeDasharray="4 3" dot={false} name="p50" connectNulls={true} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
