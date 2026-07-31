const API_BASE_URL = '/api/tenants/nestle-fmcg-demo';

interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

async function fetchWithRetry(url: string, options: FetchOptions = {}): Promise<Response> {
  const { timeout = 15000, retries = 2, ...fetchOptions } = options;
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  if (timeout && timeout > 0) {
    timeoutId = setTimeout(() => controller.abort(), timeout);
  }

  const executeFetch = async (attempt: number): Promise<Response> => {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        return executeFetch(attempt + 1);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  return executeFetch(0);
}

export async function apiGet<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>, timeout?: number): Promise<T> {
  let url = `${API_BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const response = await fetchWithRetry(url, { timeout });
  return response.json();
}

export async function apiPost<T>(endpoint: string, data: unknown, timeout?: number): Promise<T> {
  const response = await fetchWithRetry(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(data),
    timeout,
  });
  return response.json();
}

export async function apiPut<T>(endpoint: string, data: unknown): Promise<T> {
  const response = await fetchWithRetry(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function apiPatch<T>(endpoint: string, data: unknown): Promise<T> {
  const response = await fetchWithRetry(`${API_BASE_URL}${endpoint}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  const response = await fetchWithRetry(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
  });
  return response.json();
}
