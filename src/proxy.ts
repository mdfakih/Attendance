import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PREFIXES = ['/login', '/select-company', '/accept-invite', '/forgot-password', '/reset-password', '/api/', '/_next/', '/favicon.ico', '/icon.svg'];
const CONSOLE_PUBLIC = ['/console/login'];

function hasSession(req: NextRequest, realm: 'tenant' | 'platform'): boolean {
  const prefix = realm === 'tenant' ? 't' : 'p';
  return !!(req.cookies.get(`${prefix}_at`)?.value || req.cookies.get(`${prefix}_rt`)?.value);
}

/** Redirects signed-out users to the right login page. Authorisation itself happens in the API. */
export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/console')) {
    if (CONSOLE_PUBLIC.some((p) => pathname.startsWith(p)) || hasSession(req, 'platform')) return NextResponse.next();
    return NextResponse.redirect(new URL('/console/login', req.url));
  }
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) || hasSession(req, 'tenant')) return NextResponse.next();
  const login = new URL('/login', req.url);
  if (pathname !== '/') login.searchParams.set('next', pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
