'use client';

import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { keyframes } from '@mui/material/styles';
import { BrandMark, Wordmark } from '@/components/brand/brand-mark';

const pulse = keyframes`
  0% { transform: scale(0.92); opacity: 0.55; }
  70% { transform: scale(1.18); opacity: 0; }
  100% { transform: scale(1.18); opacity: 0; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;

interface AppLoaderProps {
  /** What is happening, e.g. "Loading your workspace". */
  readonly label?: string;
}

/** Full-screen branded loader for app start, sign-in and sign-out. */
export function AppLoader({ label = 'Loading' }: AppLoaderProps) {
  return (
    <Box role="status" aria-live="polite" sx={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', bgcolor: 'background.default', zIndex: (t) => t.zIndex.modal + 1 }}>
      <Stack spacing={2.5} sx={{ alignItems: 'center', px: 3, textAlign: 'center' }}>
        <Box sx={{ position: 'relative', width: 72, height: 72 }}>
          <Box sx={{ position: 'absolute', inset: -12, borderRadius: '28px', border: 2, borderColor: 'primary.main', animation: `${pulse} 1.8s ease-out infinite` }} />
          <Box sx={{ animation: `${float} 2.4s ease-in-out infinite` }}>
            <BrandMark size={72} />
          </Box>
        </Box>
        <Box>
          <Wordmark fontSize="1.25rem" />
          <Typography variant="body2" color="text.secondary">{label}…</Typography>
        </Box>
        <LinearProgress sx={{ width: 168, height: 4 }} aria-hidden />
      </Stack>
    </Box>
  );
}
