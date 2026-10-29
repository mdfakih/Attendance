'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';

interface SectionCardProps {
  readonly title?: ReactNode;
  readonly subtitle?: ReactNode;
  readonly icon?: ReactNode;
  readonly action?: ReactNode;
  readonly children: ReactNode;
  /** Remove body padding, e.g. for full-bleed tables. */
  readonly flush?: boolean;
  readonly sx?: SxProps<Theme>;
}

/** A titled card: the standard container for a block of settings, a list or a table. */
export function SectionCard({ title, subtitle, icon, action, children, flush, sx }: SectionCardProps) {
  return (
    <Card sx={sx}>
      {(title || action) && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2.5, pt: 2.25, pb: flush ? 2 : 0.5, ...(flush && { borderBottom: 1, borderColor: 'divider' }) }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
            {icon && <Box sx={{ color: 'text.secondary', display: 'flex', '& svg': { fontSize: 20 } }}>{icon}</Box>}
            <Box sx={{ minWidth: 0 }}>
              {title && <Typography variant="h6" component="h2">{title}</Typography>}
              {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
            </Box>
          </Stack>
          {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
        </Stack>
      )}
      <Box sx={flush ? undefined : { px: 2.5, pt: title || action ? 1.5 : 2.5, pb: 2.5 }}>{children}</Box>
    </Card>
  );
}
