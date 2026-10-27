import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

export type Realm = 'tenant' | 'platform';

interface CookieNames {
  readonly access: string;
  readonly refresh: string;
}

const NAMES: Readonly<Record<Realm, CookieNames>> = {
  tenant: { access: 't_at', refresh: 't_rt' },
  platform: { access: 'p_at', refresh: 'p_rt' },
};

const REFRESH_MAX_AGE: Readonly<Record<Realm, number>> = {
  tenant: 30 * 24 * 3600,
  platform: 12 * 3600,
};

export interface TokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly accessExpiresAt: string;
}

const secure = process.env.NODE_ENV === 'production';

export function cookieNames(realm: Realm): CookieNames {
  return NAMES[realm];
}

export async function readTokens(realm: Realm): Promise<{ access: string | null; refresh: string | null }> {
  const jar = await cookies();
  return { access: jar.get(NAMES[realm].access)?.value ?? null, refresh: jar.get(NAMES[realm].refresh)?.value ?? null };
}

/** Writes httpOnly cookies onto a response (never readable from browser JS). */
export function setTokens(res: NextResponse, realm: Realm, tokens: TokenPair): void {
  const names = NAMES[realm];
  const accessMaxAge = Math.max(60, Math.floor((new Date(tokens.accessExpiresAt).getTime() - Date.now()) / 1000));
  res.cookies.set(names.access, tokens.accessToken, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: accessMaxAge });
  res.cookies.set(names.refresh, tokens.refreshToken, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: REFRESH_MAX_AGE[realm] });
}

export function clearTokens(res: NextResponse, realm: Realm): void {
  const names = NAMES[realm];
  res.cookies.set(names.access, '', { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 0 });
  res.cookies.set(names.refresh, '', { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 0 });
}
