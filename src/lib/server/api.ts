import 'server-only';

export const API_URL = process.env.API_URL ?? 'http://127.0.0.1:4000';

export interface Envelope<T = unknown> {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: { readonly code: string; readonly message: string; readonly details?: unknown } | null;
  readonly meta?: unknown;
}

export interface ApiResult<T = unknown> {
  readonly status: number;
  readonly body: Envelope<T>;
}

/** Server-to-server call to the backend. Never throws on HTTP errors; returns the envelope. */
export async function apiCall<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown; token?: string | null; headers?: Record<string, string> } = {},
): Promise<ApiResult<T>> {
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
      ...(init.headers ?? {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  });
  const text = await res.text();
  let body: Envelope<T>;
  try {
    body = JSON.parse(text) as Envelope<T>;
  } catch {
    body = { success: false, data: null, error: { code: 'BAD_GATEWAY', message: 'The server returned an unexpected response.' } };
  }
  return { status: res.status, body };
}

export function failure(code: string, message: string, status = 400): ApiResult {
  return { status, body: { success: false, data: null, error: { code, message } } };
}
