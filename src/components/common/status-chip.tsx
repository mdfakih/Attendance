'use client';

import type { ReactElement } from 'react';
import Chip from '@mui/material/Chip';
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/format';
import { softTone, type ToneOrNeutral } from '@/lib/tone';

interface SoftChipProps {
  readonly label: string;
  readonly tone?: ToneOrNeutral;
  readonly size?: 'small' | 'medium';
  readonly icon?: ReactElement;
  /** Small dot before the label. */
  readonly dot?: boolean;
}

/** Tinted pill used for statuses everywhere, readable in light and dark mode. */
export function SoftChip({ label, tone = 'default', size = 'small', icon, dot }: SoftChipProps) {
  return (
    <Chip
      size={size}
      label={label}
      icon={icon}
      sx={(t) => ({
        ...softTone(t, tone),
        border: 0,
        '& .MuiChip-icon': { color: 'inherit', fontSize: 16 },
        ...(dot && {
          '& .MuiChip-label::before': { content: '""', display: 'inline-block', width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor', mr: 0.75, verticalAlign: 'middle', mb: '2px' },
        }),
      })}
    />
  );
}

export function StatusChip({ status, size = 'small' }: { status: string; size?: 'small' | 'medium' }) {
  return <SoftChip size={size} dot label={STATUS_LABEL[status] ?? humanize(status)} tone={STATUS_COLOR[status] ?? 'default'} />;
}

/** "PAST_DUE" → "Past due". */
export function humanize(value: string): string {
  const text = value.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
