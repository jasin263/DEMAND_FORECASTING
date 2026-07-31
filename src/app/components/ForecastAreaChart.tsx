'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

// Backend integration point: fetch /api/tenants/:tenantId/forecast-timeseries?granularity=weekly&horizon=12
const weeklyData = [
  { week: 'Apr 28', actual: 48200, p50: 47800, p10: 43100, p90: 52500 },
  { week: 'May 5', actual: 51300, p50: 50900, p10: 46200, p90: 55600 },
  { week: 'May 12', actual: 49700, p50: 51200, p10: 46500, p90: 55900 },
  { week: 'May 19', actual: 54100, p50: 52800, p10: 48100, p90: 57500 },
  { week: 'May 26', actual: 53400, p50: 54100, p10: 49400, p90: 58800 },
  { week: 'Jun 2', actual: 57800, p50: 56300, p10: 51600, p90: 61000 },
  { week: 'Jun 9', actual: 55200, p50: 57800, p10: 53100, p90: 62500 },
  { week: 'Jun 16', actual: 61400, p50: 59200, p10: 54500, p90: 63900 },
  { week: 'Jun 23', actual: 58900, p50: 60100, p10: 55400, p90: 64800 },
  { week: 'Jun 30', actual: 63200, p50: 62400, p10: 57700, p90: 67100 },
  { week: 'Jul 7', actual: 59800, p50: 63800, p10: 59100, p90: 68500 },
  { week: 'Jul 14', actual: 64500, p50: 64200, p10: 59500, p90: 68900 },
  { week: 'Jul 21', actual: null, p50: 66100, p10: 61400, p90: 70800 },
  { week: 'Jul 28', actual: null, p50: 67800, p10: 63100, p90: 72500 },
  { week: 'Aug 4', actual: null, p50: 69200, p10: 64500, p90: 73900 },
  { week: 'Aug 11', actual: null, p50: 70500, p10: 65800, p90: 75200 },
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  const p50 = payload.find((p) => p.name === 'p50');
  const actual = payload.find((p) => p.name === 'actual');
  const p10 = payload.find((p) => p.name === 'p10');
  const p90 = payload.find((p) => p.name === 'p90');

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
      <p className="font-semibold text-foreground mb-2">Week of {label}</p>
      {actual?.value != null && (
        <div className="flex justify-between gap-6 mb-1">
          <span className="text-muted-foreground">Actual</span>
          <span className="font-tabular text-foreground font-medium">{actual.value.toLocaleString()}</span>
        </div>
      )}
      {p50?.value != null && (
        <div className="flex justify-between gap-6 mb-1">
          <span className="text-muted-foreground">P50 Forecast</span>
          <span className="font-tabular text-accent font-medium">{p50.value.toLocaleString()}</span>
        </div>
      )}
      {p10?.value != null && p90?.value != null && (
        <div className="flex justify-between gap-6 text-muted-foreground">
          <span>P10 – P90</span>
          <span className="font-tabular">{p10.value.toLocaleString()} – {p90.value.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

export default function ForecastAreaChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={weeklyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--actual-line)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--actual-line)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--forecast-line)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--forecast-line)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.1} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          interval={1}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine x="Jul 21" stroke="var(--border)" strokeDasharray="4 4" label={{ value: 'Forecast →', position: 'top', fontSize: 10, fill: 'var(--muted-foreground)' }} />
        {/* P10–P90 band */}
        <Area type="monotone" dataKey="p90" stroke="none" fill="url(#gradBand)" name="p90" />
        <Area type="monotone" dataKey="p10" stroke="none" fill="var(--background)" name="p10" />
        {/* Actual */}
        <Area
          type="monotone"
          dataKey="actual"
          stroke="var(--actual-line)"
          strokeWidth={2}
          fill="url(#gradActual)"
          name="actual"
          dot={false}
          connectNulls={false}
        />
        {/* P50 Forecast */}
        <Area
          type="monotone"
          dataKey="p50"
          stroke="var(--forecast-line)"
          strokeWidth={2}
          strokeDasharray="5 3"
          fill="url(#gradForecast)"
          name="p50"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}