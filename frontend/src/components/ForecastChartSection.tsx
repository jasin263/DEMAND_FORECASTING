'use client';

import React, { useState, lazy, Suspense } from 'react';

const ForecastAreaChart = lazy(() => import('./ForecastAreaChart'));
const AccuracyBarChart = lazy(() => import('./AccuracyBarChart'));

function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="animate-pulse rounded-lg bg-muted" style={{ height }}>
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Loading chart...</div>
    </div>
  );
}

export default function ForecastChartSection({ category }: { category?: string }) {
  const [activeView, setActiveView] = useState<'forecast' | 'accuracy'>('forecast');

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Actual vs Forecast</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Weekly demand with P10/P90 prediction intervals · {category || 'All categories'}
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
      {activeView === 'forecast' && (
        <div className="flex items-center gap-4 mb-3">
          {[
            { color: 'var(--actual-line)', label: 'Actual Demand' },
            { color: 'var(--forecast-line)', label: 'P50 Forecast' },
            { color: 'var(--p10-fill)', label: 'P10\u2013P90 Band', dashed: true },
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
      <Suspense fallback={<ChartSkeleton height={activeView === 'forecast' ? 280 : 200} />}>
        {activeView === 'forecast' ? <ForecastAreaChart /> : <AccuracyBarChart />}
      </Suspense>
    </div>
  );
}
