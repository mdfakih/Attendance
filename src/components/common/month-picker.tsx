'use client';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { monthLabel, shiftMonth, thisMonth } from '@/lib/format';

/** Previous / next month stepper; cannot go past the current month. */
export function MonthPicker({ value, onChange }: { value: string; onChange: (month: string) => void }) {
  return (
    <Paper variant="outlined" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 2.5, px: 0.5, height: 40, width: { xs: '100%', sm: 'auto' } }}>
      <Tooltip title="Previous month">
        <IconButton size="small" onClick={() => onChange(shiftMonth(value, -1))} aria-label="Previous month">
          <ChevronLeftIcon />
        </IconButton>
      </Tooltip>
      <Typography sx={{ minWidth: 140, textAlign: 'center', fontWeight: 700, fontSize: '0.9rem' }}>{monthLabel(value)}</Typography>
      <Tooltip title="Next month">
        <span>
          <IconButton size="small" onClick={() => onChange(shiftMonth(value, 1))} disabled={value >= thisMonth()} aria-label="Next month">
            <ChevronRightIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Paper>
  );
}
