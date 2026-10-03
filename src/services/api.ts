const API_BASE = (import.meta.env.VITE_API_BASE_URL?.trim() || '/api').replace(/\/+$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code = 'api_error') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const timeout = AbortSignal.timeout(options.timeoutMs ?? 15000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? 'GET',
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    throw new ApiError(timedOut ? 'The server took too long to respond.' : 'Could not reach the server.', 0, timedOut ? 'timeout' : 'network');
  }

  // A static host without the API answers with the SPA's index.html; treat that as "no API".
  const isJson = response.headers.get('content-type')?.includes('application/json');
  if (!isJson) {
    if (response.ok || response.status === 404) throw new ApiError('The API is not available on this deployment.', 503, 'unavailable');
    throw new ApiError(`Request failed (${response.status}).`, response.status);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError(typeof error?.message === 'string' ? error.message : `Request failed (${response.status}).`, response.status, error?.code);
  }
  return payload as T;
}
