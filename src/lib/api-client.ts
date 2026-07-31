/**
 * Centralized API client for ForecastIQ
 * Handles all HTTP requests with error handling, retry logic, and type safety.
 * Points to the Python FastAPI backend on port 8000.
 */

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiRequestConfig {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
}

class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.status = error.status;
    this.code = error.code;
    this.details = error.details;
  }
}

const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const TIMEOUT_MS = 15000;

// Python backend base URL - configurable via environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

function shouldRetry(status: number): boolean {
  return status === 429 || status >= 500;
}

function buildUrl(basePath: string, params?: Record<string, string | number | boolean | undefined>): string {
  // Prepend the API base URL if the path is relative
  const fullPath = basePath.startsWith('http') ? basePath : `${API_BASE_URL}${basePath}`;
  if (!params) return fullPath;
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `${fullPath}?${queryString}` : fullPath;
}

async function request<T>(basePath: string, config: ApiRequestConfig = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, params, signal } = config;
  const url = buildUrl(basePath, params);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const combinedSignal = signal
    ? combineAbortSignals(signal, controller.signal)
    : controller.signal;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers: { ...DEFAULT_HEADERS, ...headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const apiError: ApiError = {
          status: response.status,
          message: errorBody.message || `HTTP ${response.status}: ${response.statusText}`,
          code: errorBody.code,
          details: errorBody.details,
        };
        throw new ApiClientError(apiError);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return await response.json() as T;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error as Error;

      if (error instanceof ApiClientError) {
        if (!shouldRetry(error.status) || attempt >= MAX_RETRIES) {
          throw error;
        }
      } else if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiClientError({
          status: 0,
          message: 'Request timed out',
          code: 'TIMEOUT',
        });
      } else if (attempt >= MAX_RETRIES) {
        throw new ApiClientError({
          status: 0,
          message: error instanceof Error ? error.message : 'Network error',
          code: 'NETWORK_ERROR',
        });
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
    }
  }

  throw lastError || new Error('Unexpected error');
}

function combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signals.forEach((signal) => {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
  return controller.signal;
}

// Public API
export const api = {
  get: <T>(path: string, config?: Omit<ApiRequestConfig, 'method'>) =>
    request<T>(path, { ...config, method: 'GET' }),

  post: <T>(path: string, body?: unknown, config?: Omit<ApiRequestConfig, 'method' | 'body'>) =>
    request<T>(path, { ...config, method: 'POST', body }),

  put: <T>(path: string, body?: unknown, config?: Omit<ApiRequestConfig, 'method' | 'body'>) =>
    request<T>(path, { ...config, method: 'PUT', body }),

  patch: <T>(path: string, body?: unknown, config?: Omit<ApiRequestConfig, 'method' | 'body'>) =>
    request<T>(path, { ...config, method: 'PATCH', body }),

  delete: <T>(path: string, config?: Omit<ApiRequestConfig, 'method'>) =>
    request<T>(path, { ...config, method: 'DELETE' }),
};

export { ApiClientError };
export type { ApiRequestConfig, ApiError };
