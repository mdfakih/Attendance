'use client';

import { type ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/shell/app-shell';
import { ErrorAlert, Loading } from '@/components/common/loading';
import { SessionProvider, useSessionQuery } from '@/lib/session';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useSessionQuery();
  const queryClient = useQueryClient();
  if (isLoading) return <Loading minHeight={400} />;
  if (error || !data) return <Box sx={{ p: 4 }}><ErrorAlert error={error ?? new Error('Could not load your session')} /></Box>;
  return (
    <SessionProvider session={data} refresh={() => queryClient.invalidateQueries({ queryKey: ['me'] })}>
      <AppShell>
        {data.tenant.status === 'SUSPENDED' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            This company account is suspended. Data is read-only until billing is settled.
          </Alert>
        )}
        {data.tenant.status === 'PAST_DUE' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            A payment is overdue. Please settle it to avoid suspension.
          </Alert>
        )}
        {children}
      </AppShell>
    </SessionProvider>
  );
}
