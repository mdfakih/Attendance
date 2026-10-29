'use client';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

interface StatusTabsProps {
  readonly value: string;
  readonly options: ReadonlyArray<{ value: string; label: string }>;
  readonly onChange: (value: string) => void;
}

/** Status filter as tabs: one tap, always visible. */
export function StatusTabs({ value, options, onChange }: StatusTabsProps) {
  return (
    <Tabs value={value} onChange={(_, v: string) => onChange(v)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
      {options.map((o) => (
        <Tab key={o.value || 'all'} value={o.value} label={o.label} />
      ))}
    </Tabs>
  );
}
