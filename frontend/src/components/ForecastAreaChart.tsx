import React, { useEffect, useMemo, useState } from 'react';
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
import { useForecastTimeseries } from '../lib/api-hooks';
import type { ForecastDataPoint } from '../lib/api-types';
import { Loader2 } from 'lucide-react';
import { buildWorkspaceForecastSeries, readWorkspaceForecastRun } from '../lib/workspace-forecast';

interface CustomTooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
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
          <span>P10 - P90</span>
          <span className="font-tabular">{p10.value.toLocaleString()} - {p90.value.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

export default function ForecastAreaChart() {
  const { data: timeseries, loading, error } = useForecastTimeseries({ weeks: 16 });
  const [workspaceSeries, setWorkspaceSeries] = useState<ForecastDataPoint[] | null>(null);

  useEffect(() => {
    const run = readWorkspaceForecastRun();
    setWorkspaceSeries(buildWorkspaceForecastSeries(run));
  }, []);

  const chartData = useMemo(() => {
    if (workspaceSeries && workspaceSeries.length > 0) {
      return workspaceSeries;
    }
    return timeseries ?? [];
  }, [workspaceSeries, timeseries]);

  const forecastRefLine = chartData.find((d) => d.actual == null);

  if (loading && !workspaceSeries) {
    return (
      <div className="flex items-center justify-center h-[280px] text-xs text-muted-foreground">
        <Loader2 size={16} className="animate-spin mr-2" /> Loading chart...
      </div>
    );
  }

  if (error && !workspaceSeries) {
    return (
      <div className="flex items-center justify-center h-[280px] text-xs text-negative">
        Failed to load forecast data
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-[280px] text-xs text-muted-foreground">
        No forecast data available yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        {forecastRefLine && (
          <ReferenceLine x={forecastRefLine.week} stroke="var(--border)" strokeDasharray="4 4" label={{ value: 'Forecast \u2192', position: 'top', fontSize: 10, fill: 'var(--muted-foreground)' }} />
        )}
        <Area type="monotone" dataKey="p90" stroke="none" fill="url(#gradBand)" name="p90" />
        <Area type="monotone" dataKey="p10" stroke="none" fill="var(--background)" name="p10" />
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
