import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPut, apiPost, apiPatch, apiDelete } from './api-client';
import type {
  KPISummary,
  ForecastDataPoint,
  AccuracyByCategory,
  ExceptionItem,
  ExceptionActionRequest,
  SKUForecastItem,
  SKUDetail,
  Scenario,
  DataSource,
  AppConfig,
  PaginatedResponse,
  OnboardingState,
  OnboardingConfig,
  ExportPackage,
  Integration,
  ModelAnalytics,
  AccuracyDriftReport,
  HierarchyOverview,
  BacktestRunDetail,
  WalkForwardReport,
  DecompositionSummary,
  SimulationResult,
  DemandSensingSummary,
  InventorySummary,
  ExternalFactorSummary,
  CollaborationSummary,
  ForecastAnnotation,
  ForecastOverride,
  CollaborationThread,
  ConsensusSummary,
  DataMaturitySummary,
  AnalyticsMaturitySummary,
} from './api-types';

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function useApi<T>(fetchFn: () => Promise<T>): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const initialLoadDone = useRef(false);

  // Stable refetch that doesn't change when fetchFn reference changes
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const refetch = useCallback(() => {
    if (!initialLoadDone.current) {
      setLoading(true);
    }
    setError(null);
    fetchRef.current()
      .then((result) => {
        if (mountedRef.current) {
          setData(result);
          initialLoadDone.current = true;
        }
      })
      .catch((err) => {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      })
      .finally(() => {
        if (mountedRef.current) {
          setLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refetch();
    return () => { mountedRef.current = false; };
  }, [refetch]);

  return { data, loading, error, refetch };
}

export function useKPISummary() {
  return useApi(() => apiGet<KPISummary>('/kpi-summary'));
}

export function useForecastTimeseries(params?: { weeks?: number; category?: string }) {
  return useApi(() => apiGet<ForecastDataPoint[]>('/forecast-timeseries', params as Record<string, string | number | boolean | undefined>));
}

export function useAccuracyByCategory() {
  return useApi(() => apiGet<AccuracyByCategory[]>('/accuracy-by-category'));
}

export function useLocations() {
  return useApi(() => apiGet<string[]>('/locations'));
}

export function useExceptions(params?: { severity?: string; status?: string; limit?: number }) {
  return useApi(() => {
    const queryParams: Record<string, string | number | boolean | undefined> = {};
    if (params?.severity) queryParams.severity = params.severity;
    if (params?.status) queryParams.status = params.status;
    if (params?.limit) queryParams.limit = params.limit;
    return apiGet<ExceptionItem[]>('/exceptions', queryParams);
  });
}

export function useSkus(params?: { page?: number; pageSize?: number; search?: string; sortBy?: string; sortOrder?: string; category?: string; location?: string; status?: string }) {
  return useApi(() => {
    const queryParams: Record<string, string | number | boolean | undefined> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.pageSize) queryParams.pageSize = params.pageSize;
    if (params?.search) queryParams.search = params.search;
    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
    if (params?.category) queryParams.category = params.category;
    if (params?.location) queryParams.location = params.location;
    if (params?.status) queryParams.status = params.status;
    return apiGet<PaginatedResponse<SKUForecastItem>>('/skus', queryParams);
  });
}

export function useSKUDetail(skuId: string) {
  return useApi(() => apiGet<SKUDetail>(`/skus/${skuId}`));
}

export function useScenarios() {
  return useApi(() => apiGet<Scenario[]>('/scenarios'));
}

export function useDataSources() {
  return useApi(() => apiGet<DataSource[]>('/data-sources'));
}

export function useCreateDataSource() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (data: { name: string; type: string }): Promise<DataSource> => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiPost<DataSource>('/data-sources', data);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
}

export function useRefreshDataSource() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (sourceId: string): Promise<{ status: string; message: string }> => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiPost<{ status: string; message: string }>(`/data-sources/${sourceId}/refresh`, {});
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
}

export function useDeleteDataSource() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (sourceId: string): Promise<{ status: string; message: string }> => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiDelete<{ status: string; message: string }>(`/data-sources/${sourceId}`);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
}

export function useConfiguration() {
  return useApi(() => apiGet<AppConfig>('/configuration'));
}

interface UseApiMutationResult<T> {
  execute: (data: unknown) => Promise<T>;
  loading: boolean;
  error: string | null;
}

export function useSaveConfiguration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (data: AppConfig): Promise<AppConfig> => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiPut<AppConfig>('/configuration', data);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
}

export function useOnboarding() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (data: OnboardingState): Promise<OnboardingConfig> => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiPost<OnboardingConfig>('/onboarding', data);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
}

export function useGenericDatasetProfile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (file: File): Promise<{ columns: Record<string, unknown>; suggestions: Record<string, unknown> }> => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${window.location.origin}/api/tenants/nestle-fmcg-demo/generic-dataset/profile`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
}

export function useSaveGenericDataset() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (file: File, mapping: Record<string, unknown>): Promise<{ status: string }> => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(mapping));
      const response = await fetch(`${window.location.origin}/api/tenants/nestle-fmcg-demo/generic-dataset/save`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
}

export function useGenericDatasetForecast() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (file: File, mapping: Record<string, unknown>): Promise<{ series: Array<Record<string, unknown>> }> => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(mapping));
      const response = await fetch(`${window.location.origin}/api/tenants/nestle-fmcg-demo/generic-dataset/forecast`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
}

export function useExportPackages() {
  return useApi(() => apiGet<{ packages: ExportPackage[]; integrations: Integration[] }>('/export-packages'));
}

export function useModelAnalytics() {
  return useApi(() => apiGet<ModelAnalytics>('/model-analytics', undefined, 600000));
}

export function useBacktestResults() {
  return useApi(() => apiGet<BacktestRunDetail>('/backtest-results', undefined, 600000));
}

export function useRerunForecast() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (): Promise<{ status: string; message: string; weeks: number }> => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiPost<{ status: string; message: string; weeks: number }>(
        '/forecast-timeseries/rerun', {}, 0,
      );
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
}

export function useAccuracyDrift() {
  return useApi(() => apiGet<AccuracyDriftReport>('/accuracy-drift'));
}

export function useHierarchy() {
  return useApi(() => apiGet<HierarchyOverview>('/hierarchy'));
}

export function useResolveException() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (excId: string, action: ExceptionActionRequest): Promise<ExceptionItem> => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiPatch<ExceptionItem>(`/exceptions/${excId}`, action);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
}

export function useBulkResolveExceptions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (ids: string[], action: 'resolve' | 'acknowledge' | 'dismiss', note?: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all(
        ids.map((id) => apiPatch<ExceptionItem>(`/exceptions/${id}`, { action, note }))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
}

// === 1. Walk-Forward Backtesting ===
export function useWalkForward(params?: { horizon?: number; nSplits?: number }) {
  return useApi(() => apiGet<WalkForwardReport>('/backtesting/walk-forward', params as Record<string, string | number | boolean | undefined>, 600000));
}

// === 2. Seasonality Decomposition ===
export function useSeasonalDecomposition(params?: { period?: number }) {
  return useApi(() => apiGet<DecompositionSummary>('/seasonal-decomposition', params as Record<string, string | number | boolean | undefined>, 300000));
}

// === 3. What-If Simulations ===
export function useSimulations() {
  return useApi<{ simulations: SimulationResult[]; presets: any[]; availableParams: any[] }>(() => apiGet('/simulations', undefined, 600000));
}
export function useCreateSimulation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const execute = useCallback(async (data: { name: string; description?: string; skuIds?: string[]; parameters: Record<string, number | boolean | string> }): Promise<SimulationResult> => {
    setLoading(true); setError(null);
    try { const r = await apiPost<SimulationResult>('/simulations', data); return r; }
    catch (e) { const m = e instanceof Error ? e.message : 'Error'; setError(m); throw e; }
    finally { setLoading(false); }
  }, []);
  return { execute, loading, error };
}
export function useDeleteSimulation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const execute = useCallback(async (id: string) => {
    setLoading(true); setError(null);
    try { await apiDelete(`/simulations/${id}`); }
    catch (e) { const m = e instanceof Error ? e.message : 'Error'; setError(m); throw e; }
    finally { setLoading(false); }
  }, []);
  return { execute, loading, error };
}

// === 4. Demand Sensing ===
export function useDemandSensing() {
  return useApi<DemandSensingSummary>(() => apiGet('/demand-sensing', undefined, 300000));
}

// === 5. Inventory Optimization ===
export function useInventoryOptimization(params?: { serviceLevel?: number; leadTimeDays?: number }) {
  return useApi(() => apiGet<InventorySummary>('/inventory/optimization', params as Record<string, string | number | boolean | undefined>, 600000));
}

// === 6. External Factors ===
export function useExternalFactors() {
  return useApi<ExternalFactorSummary>(() => apiGet('/external-factors', undefined, 600000));
}
export function useToggleExternalFactor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const execute = useCallback(async (factorId: string, enabled: boolean) => {
    setLoading(true); setError(null);
    try { const r = await apiPost<{ id: string; enabled: boolean }>(`/external-factors/${factorId}/toggle`, { enabled }); return r; }
    catch (e) { const m = e instanceof Error ? e.message : 'Error'; setError(m); throw e; }
    finally { setLoading(false); }
  }, []);
  return { execute, loading, error };
}

// === 7. Collaboration ===
export function useCollaboration() {
  return useApi<CollaborationSummary>(() => apiGet('/collaboration'));
}
export function useSKUCollaboration(skuId: string) {
  return useApi<{ annotations: ForecastAnnotation[]; overrides: ForecastOverride[]; threads: CollaborationThread[] }>(() => apiGet(`/collaboration/sku/${skuId}`));
}
export function useCreateAnnotation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const execute = useCallback(async (data: { skuId: string; text: string; week?: string; type?: string; originalValue?: number; adjustedValue?: number }) => {
    setLoading(true); setError(null);
    try { const r = await apiPost<ForecastAnnotation>('/collaboration/annotations', data); return r; }
    catch (e) { const m = e instanceof Error ? e.message : 'Error'; setError(m); throw e; }
    finally { setLoading(false); }
  }, []);
  return { execute, loading, error };
}
export function useCreateOverride() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const execute = useCallback(async (data: { skuId: string; week: string; reason: string; originalP50: number; adjustedP50: number; originalP10?: number; originalP90?: number; adjustedP10?: number; adjustedP90?: number }) => {
    setLoading(true); setError(null);
    try { const r = await apiPost<ForecastOverride>('/collaboration/overrides', data); return r; }
    catch (e) { const m = e instanceof Error ? e.message : 'Error'; setError(m); throw e; }
    finally { setLoading(false); }
  }, []);
  return { execute, loading, error };
}
export function useApproveOverride() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const execute = useCallback(async (overrideId: string, approved: boolean) => {
    setLoading(true); setError(null);
    try { const r = await apiPost<ForecastOverride>(`/collaboration/overrides/${overrideId}/approve`, { approved }); return r; }
    catch (e) { const m = e instanceof Error ? e.message : 'Error'; setError(m); throw e; }
    finally { setLoading(false); }
  }, []);
  return { execute, loading, error };
}
export function useCreateThread() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const execute = useCallback(async (data: { skuId: string; subject: string; text: string }) => {
    setLoading(true); setError(null);
    try { const r = await apiPost<CollaborationThread>('/collaboration/threads', data); return r; }
    catch (e) { const m = e instanceof Error ? e.message : 'Error'; setError(m); throw e; }
    finally { setLoading(false); }
  }, []);
  return { execute, loading, error };
}
export function useAddThreadMessage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const execute = useCallback(async (threadId: string, data: { text: string; week?: string }) => {
    setLoading(true); setError(null);
    try { const r = await apiPost<CollaborationThread>(`/collaboration/threads/${threadId}/messages`, data); return r; }
    catch (e) { const m = e instanceof Error ? e.message : 'Error'; setError(m); throw e; }
    finally { setLoading(false); }
  }, []);
  return { execute, loading, error };
}
export function useResolveThread() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const execute = useCallback(async (threadId: string) => {
    setLoading(true); setError(null);
    try { const r = await apiPost<CollaborationThread>(`/collaboration/threads/${threadId}/resolve`, {}); return r; }
    catch (e) { const m = e instanceof Error ? e.message : 'Error'; setError(m); throw e; }
    finally { setLoading(false); }
  }, []);
  return { execute, loading, error };
}

// === 8. Consensus / Blended Forecast ===
export function useConsensus() {
  return useApi<ConsensusSummary>(() => apiGet('/consensus', undefined, 600000));
}

// === 9. Data & Analytics Maturity ===
export function useDataMaturity() {
  return useApi<DataMaturitySummary>(() => apiGet('/data-maturity', undefined, 300000));
}

export function useAnalyticsMaturity() {
  return useApi<AnalyticsMaturitySummary>(() => apiGet('/analytics-maturity', undefined, 300000));
}
