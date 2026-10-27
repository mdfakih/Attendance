import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { API_URL } from './api';
import { isSameOrigin } from './origin';
import { clearTokens, readTokens, setTokens, type Realm, type TokenPair } from './session-cookies';

const REALM_PREFIX: Readonly<Record<Realm, string>> = { tenant: '/v1/tenant', platform: '/v1/platform' };
const REFRESH_PATH: Readonly<Record<Realm, string>> = { tenant: '/v1/tenant/auth/refresh', platform: '/v1/platform/auth/refresh' };
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const PASS_RESPONSE_HEADERS = ['content-type', 'content-disposition', 'cache-control', 'location', 'x-request-id'];

async function refresh(realm: Realm, refreshToken: string): Promise<TokenPair | null> {
  const res = await fetch(`${API_URL}${REFRESH_PATH[realm]}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { success: boolean; data: TokenPair | null };
  return json.success && json.data ? json.data : null;
}

async function forward(req: NextRequest, realm: Realm, path: string[], token: string | null, body: ArrayBuffer | null): Promise<Response> {
  const target = new URL(`${API_URL}${REALM_PREFIX[realm]}/${path.join('/')}`);
  target.search = req.nextUrl.search;
  const headers = new Headers();
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  if (token) headers.set('authorization', `Bearer ${token}`);
  headers.set('x-forwarded-for', req.headers.get('x-forwarded-for') ?? '');
  headers.set('user-agent', req.headers.get('user-agent') ?? '');
  return fetch(target, { method: req.method, headers, body: body && body.byteLength > 0 ? body : undefined, redirect: 'manual', cache: 'no-store' });
}

/**
 * Proxies a browser request to the backend with the realm's bearer token taken from httpOnly
 * cookies. On 401 it refreshes once, retries, and rotates the cookies.
 */
export async function proxyRequest(req: NextRequest, realm: Realm, path: string[]): Promise<Response> {
  if (MUTATING.has(req.method) && !isSameOrigin(req)) {
    return NextResponse.json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'Cross-site request blocked.' } }, { status: 403 });
  }
  const tokens = await readTokens(realm);
  const body = MUTATING.has(req.method) ? await req.arrayBuffer() : null;
  let upstream = await forward(req, realm, path, tokens.access, body);
  let rotated: TokenPair | null = null;
  if (upstream.status === 401 && tokens.refresh) {
    rotated = await refresh(realm, tokens.refresh);
    if (rotated) upstream = await forward(req, realm, path, rotated.accessToken, body);
  }
  const res = new NextResponse(upstream.body, { status: upstream.status });
  for (const name of PASS_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) res.headers.set(name, value);
  }
  if (rotated) setTokens(res, realm, rotated);
  else if (upstream.status === 401 && !tokens.refresh) clearTokens(res, realm);
  return res;
}
