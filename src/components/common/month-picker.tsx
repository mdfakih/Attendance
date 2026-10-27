'use client';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { monthLabel, shiftMonth, thisMonth } from '@/lib/format';

export function MonthPicker({ value, onChange }: { value: string; onChange: (month: string) => void }) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <IconButton size="small" onClick={() => onChange(shiftMonth(value, -1))} aria-label="Previous month">
        <ChevronLeftIcon />
      </IconButton>
      <Typography sx={{ minWidth: 150, textAlign: 'center', fontWeight: 600 }}>{monthLabel(value)}</Typography>
      <IconButton size="small" onClick={() => onChange(shiftMonth(value, 1))} disabled={value >= thisMonth()} aria-label="Next month">
        <ChevronRightIcon />
      </IconButton>
    </Stack>
  );
}
