'use client';

import LinearProgress from '@mui/material/LinearProgress';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

/** Thin bar along the top bar's bottom edge while anything loads or saves in the background. */
export function FetchIndicator() {
  const busy = useIsFetching() + useIsMutating() > 0;
  return (
    <LinearProgress
      aria-hidden
      sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, borderRadius: 0, opacity: busy ? 1 : 0, transition: 'opacity .3s', bgcolor: 'transparent' }}
    />
  );
}
