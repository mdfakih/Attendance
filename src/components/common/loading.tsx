'use client';

import type { ReactNode } from 'react';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { errorMessage } from '@/lib/http';

const LINE_WIDTHS = ['92%', '78%', '85%', '64%', '88%', '72%', '80%', '58%'];

interface LoadingProps {
  readonly minHeight?: number;
  readonly label?: string;
}

/** Placeholder shaped like the content it replaces: lines for short blocks, a panel for tall ones (maps, charts). */
export function Loading({ minHeight = 160, label = 'Loading' }: LoadingProps) {
  if (minHeight >= 300) {
    return (
      <Box role="status" aria-label={label} sx={{ minHeight }}>
        <Skeleton variant="rounded" height={minHeight} sx={{ borderRadius: 3 }} />
      </Box>
    );
  }
  const lines = Math.max(2, Math.min(LINE_WIDTHS.length, Math.round(minHeight / 36)));
  return (
    <Stack role="status" aria-label={label} spacing={1.25} sx={{ minHeight, py: 1 }}>
      {LINE_WIDTHS.slice(0, lines).map((width, i) => (
        <Stack key={i} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: 2, flexShrink: 0 }} />
          <Skeleton variant="text" width={width} sx={{ fontSize: '0.95rem' }} />
        </Stack>
      ))}
    </Stack>
  );
}

interface ErrorAlertProps {
  readonly error: unknown;
  readonly onRetry?: () => void;
}

export function ErrorAlert({ error, onRetry }: ErrorAlertProps) {
  return (
    <Alert
      severity="error"
      icon={<ErrorOutlineIcon />}
      action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Try again</Button> : undefined}
    >
      {errorMessage(error)}
    </Alert>
  );
}

interface EmptyStateProps {
  readonly title: string;
  readonly description?: ReactNode;
  readonly icon?: ReactNode;
  readonly action?: ReactNode;
  readonly compact?: boolean;
}

export function EmptyState({ title, description, icon, action, compact }: EmptyStateProps) {
  return (
    <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: compact ? 3 : 6, px: 2 }}>
      <Box
        sx={(t) => ({
          width: compact ? 44 : 56,
          height: compact ? 44 : 56,
          borderRadius: compact ? 2.5 : 3.5,
          display: 'grid',
          placeItems: 'center',
          color: 'primary.main',
          bgcolor: `rgba(${t.vars?.palette.primary.mainChannel} / 0.1)`,
          '& svg': { fontSize: compact ? 22 : 28 },
        })}
      >
        {icon ?? <InboxOutlinedIcon />}
      </Box>
      <Box sx={{ maxWidth: 420 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
        {description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{description}</Typography>}
      </Box>
      {action}
    </Stack>
  );
}

/** Short "nothing here" message; kept for simple lists. */
export function Empty({ text, icon, action }: { text: string; icon?: ReactNode; action?: ReactNode }) {
  return <EmptyState compact title={text} icon={icon} action={action} />;
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: count }, (_, i) => (
        <Grid key={i} size={{ xs: 6, md: 12 / Math.min(count, 4) }}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Skeleton variant="rounded" width={40} height={40} sx={{ borderRadius: 2.5 }} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" sx={{ fontSize: '1.6rem' }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card>
      <Box sx={{ px: 2.5, py: 1.75, borderBottom: 1, borderColor: 'divider' }}>
        <Skeleton variant="text" width="35%" />
      </Box>
      {Array.from({ length: rows }, (_, i) => (
        <Stack key={i} direction="row" spacing={2} sx={{ alignItems: 'center', px: 2.5, py: 1.5, borderBottom: i === rows - 1 ? 0 : 1, borderColor: 'divider' }}>
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="text" sx={{ flex: 2 }} />
          <Skeleton variant="text" sx={{ flex: 1 }} />
          <Skeleton variant="rounded" width={72} height={22} sx={{ borderRadius: 2 }} />
        </Stack>
      ))}
    </Card>
  );
}

/** Content-area placeholder while a page's code or first data loads. */
export function PageSkeleton() {
  return (
    <Stack spacing={3} role="status" aria-label="Loading page">
      <Box>
        <Skeleton variant="text" width={220} sx={{ fontSize: '1.6rem' }} />
        <Skeleton variant="text" width={320} />
      </Box>
      <StatGridSkeleton count={4} />
      <TableSkeleton rows={5} />
    </Stack>
  );
}
