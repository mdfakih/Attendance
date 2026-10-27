import 'server-only';
import type { NextRequest } from 'next/server';

/**
 * CSRF guard for cookie-authenticated mutations: the browser's Origin must match the host the
 * request arrived on. Derived from the Host header because Next rewrites `nextUrl` in dev.
 */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // non-browser or same-origin GET; browsers always send Origin on cross-site POST
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!host) return false;
  const proto = req.headers.get('x-forwarded-proto') ?? (req.nextUrl.protocol.replace(':', '') || 'http');
  try {
    const o = new URL(origin);
    return o.host === host && (o.protocol === `${proto}:` || o.protocol === 'https:');
  } catch {
    return false;
  }
}
