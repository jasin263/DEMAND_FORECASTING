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
} from 'recharts';
import { useAccuracyByCategory } from '../lib/api-hooks';
import { Loader2 } from 'lucide-react';

const barColors = ['var(--primary)', 'var(--accent)', 'var(--positive)', 'var(--warning)', 'var(--info)', 'var(--negative)'];

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
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].color }} />
        <span className="text-muted-foreground">Accuracy</span>
        <span className="font-tabular font-medium text-foreground">{payload[0].value}%</span>
      </div>
    </div>
  );
};

export default function AccuracyBarChart() {
  const { data: categories, loading, error } = useAccuracyByCategory();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[200px] text-xs text-muted-foreground">
        <Loader2 size={16} className="animate-spin mr-2" /> Loading accuracy...
      </div>
    );
  }

  if (error || !categories) {
    return (
      <div className="flex items-center justify-center h-[200px] text-xs text-negative">
        Failed to load accuracy data
      </div>
    );
  }

  const chartData = categories.map((c) => ({
    category: c.category,
    accuracy: Math.round((100 - c.mape) * 10) / 10,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="category"
          tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
          width={32}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="accuracy" radius={[4, 4, 0, 0]} maxBarSize={32}>
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
