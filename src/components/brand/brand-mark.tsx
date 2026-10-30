'use client';

import { useId } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { PRODUCT } from '@/lib/brand';

interface BrandMarkProps {
  readonly size?: number;
}

/**
 * The product mark: a "K" whose upper arm is a rising arrow (kamai, going up), filled with the active brand gradient.
 * Same geometry as `src/app/icon.svg` and the mobile launcher icons.
 */
export function BrandMark({ size = 32 }: BrandMarkProps) {
  const id = useId().replace(/:/g, '');
  return (
    <Box component="svg" viewBox="0 0 48 48" width={size} height={size} aria-hidden sx={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--mui-palette-primary-main)' }} />
          <stop offset="1" style={{ stopColor: 'var(--mui-palette-secondary-main)' }} />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill={`url(#g${id})`} />
      <g fill="none" stroke="#fff" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15.5 12.5v23" />
        <path d="M15.5 29.5L32.5 12.5M24.5 12.5h8v8" />
        <path d="M22.5 22.5l10 13" />
      </g>
    </Box>
  );
}

interface WordmarkProps {
  readonly fontSize: number | string;
  /** Colour of the "Go" part; the brand primary by default. Pass `inherit` on coloured backgrounds. */
  readonly accentColor?: string;
  readonly accentOpacity?: number;
}

/** The product name set as a wordmark: "Kamai" in the text colour, "Go" in the accent. */
export function Wordmark({ fontSize, accentColor = 'primary.main', accentOpacity }: WordmarkProps) {
  return (
    <Typography
      component="span"
      sx={{ display: 'block', fontFamily: 'var(--font-display), inherit', fontWeight: 800, fontSize, lineHeight: 1.1, letterSpacing: '-0.02em' }}
      noWrap
    >
      {PRODUCT.wordmark.base}
      <Box component="span" sx={{ color: accentColor, opacity: accentOpacity }}>
        {PRODUCT.wordmark.accent}
      </Box>
    </Typography>
  );
}

interface BrandLogoProps {
  readonly size?: number;
  /** Small caption under the name, e.g. "Console". */
  readonly caption?: string;
}

export function BrandLogo({ size = 32, caption }: BrandLogoProps) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
      <BrandMark size={size} />
      <Box sx={{ minWidth: 0 }}>
        <Wordmark fontSize={size * 0.56} />
        {caption && (
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.65rem' }} noWrap>
            {caption}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
