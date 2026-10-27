import { NextResponse, type NextRequest } from 'next/server';
import { apiCall, failure } from '@/lib/server/api';
import { isSameOrigin } from '@/lib/server/origin';
import { clearTokens, readTokens, setTokens, type Realm, type TokenPair } from '@/lib/server/session-cookies';

type Ctx = { params: Promise<{ realm: string; action: string }> };

/** Public auth actions that end with cookies being set when the backend returns tokens. */
const TOKEN_ACTIONS: Readonly<Record<Realm, Readonly<Record<string, string>>>> = {
  tenant: {
    login: '/v1/tenant/auth/login',
    'select-company': '/v1/tenant/auth/select-company',
    'accept-invite': '/v1/tenant/auth/accept-invite',
  },
  platform: { login: '/v1/platform/auth/login' },
};

/** Public actions that never set cookies. */
const PLAIN_ACTIONS: Readonly<Record<Realm, Readonly<Record<string, string>>>> = {
  tenant: { 'forgot-password': '/v1/tenant/auth/forgot-password', 'reset-password': '/v1/tenant/auth/reset-password' },
  platform: {},
};

const LOGOUT_PATH: Readonly<Record<Realm, string>> = { tenant: '/v1/tenant/auth/logout', platform: '/v1/platform/auth/logout' };

function isRealm(value: string): value is Realm {
  return value === 'tenant' || value === 'platform';
}

function isTokenPair(data: unknown): data is TokenPair {
  return typeof data === 'object' && data !== null && 'accessToken' in data && 'refreshToken' in data;
}

export async function POST(req: NextRequest, ctx: Ctx): Promise<Response> {
  const { realm, action } = await ctx.params;
  if (!isRealm(realm)) return NextResponse.json(failure('NOT_FOUND', 'Unknown realm', 404).body, { status: 404 });
  if (!isSameOrigin(req)) {
    return NextResponse.json(failure('FORBIDDEN', 'Cross-site request blocked.', 403).body, { status: 403 });
  }
  const body: unknown = await req.json().catch(() => ({}));

  if (action === 'logout') {
    const { refresh } = await readTokens(realm);
    if (refresh) await apiCall(LOGOUT_PATH[realm], { method: 'POST', body: { refreshToken: refresh } });
    const res = NextResponse.json({ success: true, data: { ok: true }, error: null });
    clearTokens(res, realm);
    return res;
  }

  if (realm === 'tenant' && action === 'switch-company') {
    const { access } = await readTokens(realm);
    const result = await apiCall<TokenPair>('/v1/tenant/auth/switch-company', { method: 'POST', body, token: access });
    const res = NextResponse.json(result.body, { status: result.status });
    if (result.body.success && isTokenPair(result.body.data)) setTokens(res, realm, result.body.data);
    return res;
  }

  const plain = PLAIN_ACTIONS[realm][action];
  if (plain) {
    const result = await apiCall(plain, { method: 'POST', body });
    return NextResponse.json(result.body, { status: result.status });
  }

  const tokenPath = TOKEN_ACTIONS[realm][action];
  if (!tokenPath) return NextResponse.json(failure('NOT_FOUND', 'Unknown action', 404).body, { status: 404 });
  const result = await apiCall<unknown>(tokenPath, { method: 'POST', body, headers: { 'x-forwarded-for': req.headers.get('x-forwarded-for') ?? '' } });
  const data = result.body.data as { kind?: string } | TokenPair | null;
  const res = NextResponse.json(
    // Never leak raw tokens to the browser; the cookies carry them.
    result.body.success && isTokenPair(data) ? { success: true, data: { kind: 'TOKENS' }, error: null } : result.body,
    { status: result.status },
  );
  if (result.body.success && isTokenPair(data)) setTokens(res, realm, data);
  return res;
}
