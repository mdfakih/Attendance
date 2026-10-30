/** The wordmark sets the accent part in the brand colour: Kamai·Go. */
const WORDMARK = { base: 'Kamai', accent: 'Go' } as const;
const NAME = `${WORDMARK.base}${WORDMARK.accent}` as const;

/** Product identity shared by the dashboard, the platform console and the employee app. */
export const PRODUCT = {
  name: NAME,
  wordmark: WORDMARK,
  tagline: 'Attendance and pay, made simple',
  consoleName: `${NAME} Console`,
} as const;

/** "Acme Industries" → "AI"; falls back to the first letter. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function pageTitle(title?: string): string {
  return title ? `${title} · ${PRODUCT.name}` : PRODUCT.name;
}
