import type { ForecastDataPoint, SKUForecastItem, ExceptionItem } from './api-types';

export interface WorkspaceForecastRun {
  workspaceName?: string;
  industry?: string;
  fileName?: string;
  mapping?: Record<string, unknown>;
  result?: {
    series?: Array<{
      entity?: string;
      actual?: number | null;
      forecast?: Array<number | string>;
    }>;
  };
}

export function readWorkspaceForecastRun(): WorkspaceForecastRun | null {
  try {
    const stored = window.localStorage.getItem('forecastiq.lastForecastRun');
    if (!stored) return null;
    const parsed = JSON.parse(stored) as WorkspaceForecastRun;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function buildWorkspaceForecastSeries(run: WorkspaceForecastRun | null): ForecastDataPoint[] | null {
  const result = run?.result;
  if (!result || typeof result !== 'object') return null;

  const payload = result as { series?: Array<{ entity?: string; actual?: number | null; forecast?: Array<number | string> }> };
  const firstSeries = payload.series?.[0];

  if (!firstSeries) return null;

  const forecastValues = (firstSeries.forecast || [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (forecastValues.length === 0) return null;

  const actualValue = Number(firstSeries.actual ?? 0);
  const points: ForecastDataPoint[] = [];
  const seededActual = Number.isFinite(actualValue) ? actualValue : 0;
  const historicalPoints = Math.min(2, forecastValues.length);

  for (let index = 0; index < historicalPoints; index += 1) {
    const pointValue = index === historicalPoints - 1 ? seededActual : null;
    points.push({
      week: `H${index + 1}`,
      actual: pointValue,
      p50: pointValue ?? 0,
      p10: pointValue != null ? pointValue * 0.9 : 0,
      p90: pointValue != null ? pointValue * 1.1 : 0,
    });
  }

  forecastValues.forEach((value, index) => {
    points.push({
      week: `F${index + 1}`,
      actual: null,
      p50: value,
      p10: value * 0.9,
      p90: value * 1.1,
    });
  });

  return points;
}

export function buildWorkspaceSkuItems(run: WorkspaceForecastRun | null): SKUForecastItem[] {
  const series = run?.result?.series ?? [];

  if (!series.length) return [];

  return series.map((item, index) => {
    const actual = Number(item.actual ?? 0);
    const forecastValues = (item.forecast || [])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    const lastForecast = forecastValues.at(-1) ?? actual;
    const mape = actual > 0 ? Math.abs(lastForecast - actual) / actual * 100 : 0;
    const bias = actual > 0 ? ((lastForecast - actual) / actual) * 100 : 0;
    const reorderQty = Math.max(10, Math.round(Math.abs(lastForecast) * 0.2));
    const safetyStock = Math.max(5, Math.round(Math.abs(lastForecast) * 0.1));
    const trend = forecastValues.length > 0 ? [actual, ...forecastValues.slice(0, 6)] : [actual, actual * 0.95, actual * 1.02];
    const pattern = mape > 25 ? 'Intermittent' : mape > 15 ? 'Seasonal' : 'Smooth';

    return {
      id: `workspace-${index + 1}`,
      skuId: `WS-${String(index + 1).padStart(2, '0')}`,
      name: item.entity ? String(item.entity) : `Workspace SKU ${index + 1}`,
      category: run?.industry || 'Workspace',
      location: 'Workspace',
      mape: Number(mape.toFixed(1)),
      bias: Number(bias.toFixed(1)),
      p50Forecast: Number(lastForecast.toFixed(1)),
      reorderQty,
      safetyStock,
      model: 'Workspace',
      pattern,
      lastActual: Number(actual.toFixed(1)),
      trend,
      fullTrend: trend,
    };
  });
}

export function buildWorkspaceExceptions(run: WorkspaceForecastRun | null): ExceptionItem[] {
  const series = run?.result?.series ?? [];

  if (!series.length) return [];

  return series
    .map((item, index) => {
      const actual = Number(item.actual ?? 0);
      const forecastValues = (item.forecast || [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));
      const lastForecast = forecastValues.at(-1) ?? actual;
      const gapRatio = actual > 0 ? Math.abs(lastForecast - actual) / actual : 0;
      const severity: ExceptionItem['severity'] = gapRatio > 0.3 ? 'high' : gapRatio > 0.2 ? 'medium' : 'low';
      const type = gapRatio > 0.3 ? 'high-mape' : gapRatio > 0.2 ? 'stockout-risk' : 'demand-spike';

      return {
        id: `workspace-exc-${index + 1}`,
        skuId: `WS-${String(index + 1).padStart(2, '0')}`,
        sku: `WS-${String(index + 1).padStart(2, '0')}`,
        name: item.entity ? `${String(item.entity)} needs review` : `Workspace SKU ${index + 1}`,
        description: `Forecast variance ${Math.round(gapRatio * 100)}% against uploaded history`,
        type,
        severity,
        timestamp: new Date().toISOString(),
        category: run?.industry || 'Workspace',
        location: 'Workspace',
        status: 'open',
        mape: Number((gapRatio * 100).toFixed(1)),
      };
    })
    .filter((item) => item.severity !== 'low')
    .slice(0, 7);
}

export function buildWorkspaceKpiSummary(run: WorkspaceForecastRun | null) {
  const result = run?.result;
  const series = result?.series ?? [];

  if (!series.length) return null;

  const actualValues = series
    .map((item) => Number(item.actual))
    .filter((value) => Number.isFinite(value));

  const forecastValues = series
    .flatMap((item) => (item.forecast || []).map((value) => Number(value)))
    .filter((value) => Number.isFinite(value));

  if (forecastValues.length === 0) return null;

  const latestActual = actualValues[actualValues.length - 1] ?? 0;
  const latestForecast = forecastValues[forecastValues.length - 1] ?? 0;
  const totalForecastedDemand = Math.round(forecastValues.reduce((sum, value) => sum + value, 0));

  const wape = Number(Math.max(0, Math.min(40, latestActual ? Math.abs(latestForecast - latestActual) / latestActual * 100 : 0)).toFixed(1));
  const mape = Number(Math.max(0, Math.min(40, latestActual ? Math.abs(latestForecast - latestActual) / Math.max(latestActual, 1) * 100 : 0)).toFixed(1));
  const forecastBias = Number((((latestForecast - latestActual) / Math.max(latestActual, 1)) * 100).toFixed(1));
  const serviceLevel = Number(Math.max(80, Math.min(99.5, 99.5 - wape * 0.12)).toFixed(1));
  const exceptionSkus = series.filter((item) => {
    const actual = Number(item.actual ?? 0);
    const lastForecast = (item.forecast || []).slice(-1)[0];
    const forecast = Number(lastForecast ?? 0);
    return actual > 0 && Math.abs(forecast - actual) / actual > 0.25;
  }).length;

  return {
    wape,
    wapeDelta: Number((wape * -0.1).toFixed(1)),
    mape,
    mapeDelta: Number((mape * -0.08).toFixed(1)),
    totalForecastedDemand,
    totalForecastedDemandDelta: Number((totalForecastedDemand / 1000).toFixed(1)),
    exceptionSkus,
    exceptionSkusDelta: Math.max(0, exceptionSkus - 1),
    forecastBias,
    serviceLevel,
    serviceLevelDelta: Number((serviceLevel - 97.5).toFixed(1)),
  };
}
