/**
 * Where to go after signing in: the `next` path only when it stays on this site, otherwise the fallback.
 * Resolving against the origin catches tricks like `/\evil.com` or `/\t/evil.com` that browsers treat as external.
 */
export function safeNext(raw: string | null, origin: string, fallback = '/dashboard'): string {
  if (!raw || !raw.startsWith('/')) return fallback;
  try {
    const url = new URL(raw, origin);
    return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}
