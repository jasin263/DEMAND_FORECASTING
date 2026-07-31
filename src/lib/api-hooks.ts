/**
 * Custom React hooks for API data fetching in ForecastIQ.
 * Provides useApi, useApiMutation, and typed hooks for each entity.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api, ApiClientError } from './api-client';
import type { ApiRequestConfig } from './api-client';

// ===== Generic Hooks =====

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const initialLoadDone = useRef(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchData = useCallback(async () => {
    if (!initialLoadDone.current) {
      setLoading(true);
    }
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (mountedRef.current) {
        setData(result);
        initialLoadDone.current = true;
      }
    } catch (err) {
      if (mountedRef.current) {
        const message =
          err instanceof ApiClientError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'An unexpected error occurred';
        setError(message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ===== Typed API Hooks =====

import type {
  KPISummary,
  ForecastDataPoint,
  AccuracyByCategory,
  ExceptionItem,
  SKUItem,
  SKUDetail,
  Scenario,
  DataSource,
  AppConfig,
  PaginatedResponse,
} from './api-types';

// --- Tenant ID for demo ---
const TENANT_ID = 'nestle-fmcg-demo';

// --- KPI Summary ---
export function useKPISummary() {
  return useApi<KPISummary>(
    () => api.get<KPISummary>(`/api/tenants/${TENANT_ID}/kpi-summary`),
    []
  );
}

// --- Forecast Timeseries ---
export function useForecastTimeseries(params?: { granularity?: string; horizon?: number }) {
  return useApi<ForecastDataPoint[]>(
    () =>
      api.get<ForecastDataPoint[]>(
        `/api/tenants/${TENANT_ID}/forecast-timeseries`,
        { params: params as Record<string, string | number | boolean | undefined> }
      ),
    [params?.granularity, params?.horizon]
  );
}

// --- Accuracy by Category ---
export function useAccuracyByCategory() {
  return useApi<AccuracyByCategory[]>(
    () => api.get<AccuracyByCategory[]>(`/api/tenants/${TENANT_ID}/accuracy-by-category`),
    []
  );
}

// --- SKUs ---
export function useSKUs(params?: {
  page?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}) {
  return useApi<PaginatedResponse<SKUItem>>(
    () =>
      api.get<PaginatedResponse<SKUItem>>(`/api/tenants/${TENANT_ID}/skus`, {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    [params?.page, params?.sort, params?.order, params?.search]
  );
}

// --- SKU Detail ---
export function useSKUDetail(skuId: string | null) {
  return useApi<SKUDetail | null>(
    () =>
      skuId
        ? api.get<SKUDetail>(`/api/tenants/${TENANT_ID}/skus/${skuId}`)
        : Promise.resolve(null),
    [skuId]
  );
}

// --- Exceptions ---
export function useExceptions(params?: { limit?: number; type?: string }) {
  return useApi<ExceptionItem[]>(
    () =>
      api.get<ExceptionItem[]>(`/api/tenants/${TENANT_ID}/exceptions`, {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    [params?.limit, params?.type]
  );
}

// --- Scenarios ---
export function useScenarios() {
  return useApi<Scenario[]>(
    () => api.get<Scenario[]>(`/api/tenants/${TENANT_ID}/scenarios`),
    []
  );
}

// --- Data Sources ---
export function useDataSources() {
  return useApi<DataSource[]>(
    () => api.get<DataSource[]>(`/api/tenants/${TENANT_ID}/data-sources`),
    []
  );
}

// --- Configuration ---
export function useConfiguration() {
  return useApi<AppConfig>(
    () => api.get<AppConfig>(`/api/tenants/${TENANT_ID}/configuration`),
    []
  );
}

// ===== Mutation Hook =====

interface UseApiMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

export function useApiMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>
): UseApiMutationResult<TData, TVariables> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setLoading(true);
      setError(null);
      try {
        const result = await mutationFn(variables);
        return result;
      } catch (err) {
        const message =
          err instanceof ApiClientError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'An unexpected error occurred';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [mutationFn]
  );

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
  }, []);

  return { mutate, loading, error, reset };
}

// --- Pre-built mutations ---
export function useSaveConfiguration() {
  return useApiMutation<AppConfig, AppConfig>((config) =>
    api.put(`/api/tenants/${TENANT_ID}/configuration`, config)
  );
}

// --- Export Packages ---
export function useExportPackages() {
  return useApi<{ packages: ExportPackage[]; integrations: Integration[] }>(
    () =>
      api.get<{ packages: ExportPackage[]; integrations: Integration[] }>(
        `/api/tenants/${TENANT_ID}/export-packages`
      ),
    []
  );
}

// --- Model Analytics ---
export function useModelAnalytics() {
  return useApi<ModelAnalytics>(
    () => api.get<ModelAnalytics>(`/api/tenants/${TENANT_ID}/model-analytics`),
    []
  );
}

// --- Backtest Results ---
export function useBacktestResults() {
  return useApi<BacktestRunDetail>(
    () => api.get<BacktestRunDetail>(`/api/tenants/${TENANT_ID}/backtest-results`),
    []
  );
}

// ===== Data Source Mutations =====

export interface DataSourceCreate {
  name: string;
  type: 'ERP' | 'POS' | 'Supplier' | 'API' | 'Manual';
}

export function useCreateDataSource() {
  return useApiMutation<DataSource, DataSourceCreate>((data) =>
    api.post(`/api/tenants/${TENANT_ID}/data-sources`, data)
  );
}

export function useRefreshDataSource() {
  return useApiMutation<{ status: string; message: string }, string>((sourceId) =>
    api.post(`/api/tenants/${TENANT_ID}/data-sources/${sourceId}/refresh`)
  );
}

export function useDeleteDataSource() {
  return useApiMutation<{ status: string; message: string }, string>((sourceId) =>
    api.delete(`/api/tenants/${TENANT_ID}/data-sources/${sourceId}`)
  );
}
