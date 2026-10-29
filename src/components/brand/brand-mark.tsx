'use client';

import { useId } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { PRODUCT } from '@/lib/brand';

interface BrandMarkProps {
  readonly size?: number;
}

/** The product mark: a clock face with a check, filled with the active brand gradient. */
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
      <circle cx="24" cy="24" r="12.5" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="3" />
      <path d="M24 11.5a12.5 12.5 0 0 1 12.5 12.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M18.5 24.5l4 4 7.5-8" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </Box>
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
        <Typography sx={{ fontFamily: 'var(--font-display), inherit', fontWeight: 800, fontSize: size * 0.56, lineHeight: 1.1, letterSpacing: '-0.02em' }} noWrap>
          {PRODUCT.name}
        </Typography>
        {caption && (
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.65rem' }} noWrap>
            {caption}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
