'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/ui/LoadingSkeleton';
import { AlertTriangle } from 'lucide-react';
import { useForecastTimeseries, useAccuracyByCategory } from '@/lib/api-hooks';

const ForecastAreaChart = dynamic(() => import('./ForecastAreaChart'), {
  ssr: false,
  loading: () => <ChartSkeleton height={280} />,
});

const AccuracyBarChart = dynamic(() => import('./AccuracyBarChart'), {
  ssr: false,
  loading: () => <ChartSkeleton height={200} />,
});

export default function ForecastChartSection() {
  const [activeView, setActiveView] = useState<'forecast' | 'accuracy'>('forecast');
  const { data: forecastData, loading: forecastLoading, error: forecastError, refetch: refetchForecast } = useForecastTimeseries({ granularity: 'weekly', horizon: 12 });
  const { data: accuracyData, loading: accuracyLoading, error: accuracyError, refetch: refetchAccuracy } = useAccuracyByCategory();

  const loading = forecastLoading || accuracyLoading;
  const error = forecastError || accuracyError;

  const renderChart = () => {
    if (forecastError || accuracyError) {
      return (
        <div className="rounded-2xl border border-negative/30 bg-negative/5 p-6 text-center">
          <AlertTriangle size={24} className="text-negative mx-auto mb-2" />
          <p className="text-sm text-negative font-medium">Failed to load chart data</p>
          <button onClick={() => { refetchForecast(); refetchAccuracy(); }} className="btn-secondary text-xs mt-3 py-1.5">Retry</button>
        </div>
      );
    }
    if (activeView === 'forecast') return <ForecastAreaChart />;
    return <AccuracyBarChart />;
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Actual vs Forecast</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Weekly demand with P10/P90 prediction intervals · All categories
          </p>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setActiveView('forecast')}
            className={activeView === 'forecast' ? 'tab-btn-active text-xs py-1 px-3' : 'tab-btn text-xs py-1 px-3'}
          >
            Forecast
          </button>
          <button
            onClick={() => setActiveView('accuracy')}
            className={activeView === 'accuracy' ? 'tab-btn-active text-xs py-1 px-3' : 'tab-btn text-xs py-1 px-3'}
          >
            Accuracy by Category
          </button>
        </div>
      </div>
      {/* Legend */}
      {activeView === 'forecast' && (
        <div className="flex items-center gap-4 mb-3">
          {[
            { color: 'var(--actual-line)', label: 'Actual Demand' },
            { color: 'var(--forecast-line)', label: 'P50 Forecast' },
            { color: 'var(--p10-fill)', label: 'P10–P90 Band', dashed: true },
          ].map((item) => (
            <div key={`legend-${item.label}`} className="flex items-center gap-1.5">
              <div
                className="w-3 h-0.5 rounded-full"
                style={{
                  backgroundColor: item.color,
                  borderTop: item.dashed ? `2px dashed ${item.color}` : undefined,
                }}
              />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      )}
      {renderChart()}
    </div>
  );
}