'use client';

import axios, { type AxiosInstance, AxiosError } from 'axios';

export interface ApiMeta {
  readonly page?: number;
  readonly pageSize?: number;
  readonly total?: number;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface Envelope<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
  meta?: ApiMeta;
}

export interface Paged<T> {
  readonly items: T[];
  readonly meta: ApiMeta;
}

/** Nest's reply for a route the running API does not have, e.g. an API deployed before this web build. */
const MISSING_ROUTE = /^Cannot (GET|POST|PUT|PATCH|DELETE) \//;
const OUTDATED_API_MESSAGE = 'The server is running an older version that doesn’t support this yet. Deploy the latest API (and run its database migrations), then try again.';

function create(baseURL: string, loginPath: string): AxiosInstance {
  const instance = axios.create({ baseURL, withCredentials: true, timeout: 60_000 });
  instance.interceptors.response.use(
    (res) => res,
    (error: AxiosError<Envelope<unknown>>) => {
      const body = error.response?.data;
      const status = error.response?.status ?? 0;
      if (status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith(loginPath)) {
        window.location.assign(`${loginPath}?next=${encodeURIComponent(window.location.pathname)}`);
      }
      if (status === 404 && body?.error && MISSING_ROUTE.test(body.error.message)) throw new ApiError('API_OUTDATED', OUTDATED_API_MESSAGE, status);
      if (body?.error) throw new ApiError(body.error.code, body.error.message, status, body.error.details);
      throw new ApiError('NETWORK', status === 0 ? 'Cannot reach the server.' : `Request failed (${status}).`, status);
    },
  );
  return instance;
}

export const tenantHttp = create('/api/t', '/login');
export const platformHttp = create('/api/c', '/console/login');

function unwrap<T>(body: Envelope<T>): T {
  if (!body.success || body.data === null) {
    throw new ApiError(body.error?.code ?? 'UNKNOWN', body.error?.message ?? 'Unexpected response', 500, body.error?.details);
  }
  return body.data;
}

export const api = {
  get: async <T>(url: string, params?: Record<string, unknown>): Promise<T> => unwrap<T>((await tenantHttp.get<Envelope<T>>(url, { params })).data),
  getPaged: async <T>(url: string, params?: Record<string, unknown>): Promise<Paged<T>> => {
    const body = (await tenantHttp.get<Envelope<T[]>>(url, { params })).data;
    return { items: unwrap(body), meta: body.meta ?? {} };
  },
  post: async <T>(url: string, data?: unknown): Promise<T> => unwrap<T>((await tenantHttp.post<Envelope<T>>(url, data)).data),
  put: async <T>(url: string, data?: unknown): Promise<T> => unwrap<T>((await tenantHttp.put<Envelope<T>>(url, data)).data),
  patch: async <T>(url: string, data?: unknown): Promise<T> => unwrap<T>((await tenantHttp.patch<Envelope<T>>(url, data)).data),
  delete: async <T>(url: string): Promise<T> => unwrap<T>((await tenantHttp.delete<Envelope<T>>(url)).data),
  upload: async <T>(url: string, file: File): Promise<T> => {
    const form = new FormData();
    form.append('file', file);
    return unwrap<T>((await tenantHttp.post<Envelope<T>>(url, form, { headers: { 'content-type': 'multipart/form-data' } })).data);
  },
  /** Downloads a binary response (XLSX) and triggers a save in the browser. */
  download: async (url: string, fileName: string, method: 'GET' | 'POST' = 'GET', data?: unknown): Promise<void> => {
    const res = await tenantHttp.request<Blob>({ url, method, data, responseType: 'blob' });
    const href = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = href;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(href);
  },
};

export const consoleApi = {
  get: async <T>(url: string, params?: Record<string, unknown>): Promise<T> => unwrap<T>((await platformHttp.get<Envelope<T>>(url, { params })).data),
  getPaged: async <T>(url: string, params?: Record<string, unknown>): Promise<Paged<T>> => {
    const body = (await platformHttp.get<Envelope<T[]>>(url, { params })).data;
    return { items: unwrap(body), meta: body.meta ?? {} };
  },
  post: async <T>(url: string, data?: unknown): Promise<T> => unwrap<T>((await platformHttp.post<Envelope<T>>(url, data)).data),
  put: async <T>(url: string, data?: unknown): Promise<T> => unwrap<T>((await platformHttp.put<Envelope<T>>(url, data)).data),
  patch: async <T>(url: string, data?: unknown): Promise<T> => unwrap<T>((await platformHttp.patch<Envelope<T>>(url, data)).data),
  delete: async <T>(url: string): Promise<T> => unwrap<T>((await platformHttp.delete<Envelope<T>>(url)).data),
};

/** Auth actions go through the BFF, which sets httpOnly cookies. */
export async function authAction<T = { kind: string }>(realm: 'tenant' | 'platform', action: string, data?: unknown): Promise<T> {
  const res = await axios.post<Envelope<T>>(`/api/auth/${realm}/${action}`, data ?? {}, { validateStatus: () => true });
  return unwrap(res.data);
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}
