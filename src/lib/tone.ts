import type { Theme } from '@mui/material/styles';

export type Tone = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
export type ToneOrNeutral = Tone | 'default';

/** A translucent tint of a palette colour that follows light/dark mode. */
export function tint(theme: Theme, tone: Tone, opacity: number): string {
  return `rgba(${theme.vars?.palette[tone].mainChannel} / ${opacity})`;
}

/** Soft "pill" colours for a tone: tinted background, strong text. */
export function softTone(theme: Theme, tone: ToneOrNeutral) {
  if (tone === 'default') {
    return { color: theme.vars?.palette.text.secondary, backgroundColor: `rgba(${theme.vars?.palette.text.primaryChannel} / 0.07)` };
  }
  return { color: theme.vars?.palette[tone].main, backgroundColor: tint(theme, tone, 0.12) };
}
