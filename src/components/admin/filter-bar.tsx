'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';

interface FilterBarProps {
  readonly children: ReactNode;
  /** Right-aligned content such as a result count or a legend. */
  readonly end?: ReactNode;
}

/** Tidy, responsive row of filters above a list: one column on phones, a grid on wider screens. */
export function FilterBar({ children, end }: FilterBarProps) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2.5, borderRadius: 3.5 }}>
      <Box sx={{ display: 'grid', gap: 1.5, alignItems: 'center', gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(190px, 1fr))' } }}>
        {children}
      </Box>
      {end && (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
          {end}
        </Stack>
      )}
    </Paper>
  );
}
