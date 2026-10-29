'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import CreditCardOffOutlinedIcon from '@mui/icons-material/CreditCardOffOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import { useQueryClient } from '@tanstack/react-query';
import { AppLoader } from '@/components/common/app-loader';
import { EmptyState } from '@/components/common/loading';
import { AppShell } from '@/components/shell/app-shell';
import { useApplyBranding } from '@/lib/branding-context';
import { errorMessage } from '@/lib/http';
import { SessionProvider, useSessionQuery } from '@/lib/session';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { data, isLoading, error, refetch } = useSessionQuery();
  const queryClient = useQueryClient();
  useApplyBranding(data?.tenant.branding);
  if (isLoading) return <AppLoader label="Loading your workspace" />;
  if (error || !data) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2, bgcolor: 'background.default' }}>
        <Card sx={{ maxWidth: 460, width: '100%' }}>
          <EmptyState
            icon={<ReportProblemOutlinedIcon />}
            title="We couldn’t open your workspace"
            description={errorMessage(error ?? new Error('Could not load your session.'))}
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" onClick={() => refetch()}>Try again</Button>
                <Button component={Link} href="/login">Sign in again</Button>
              </Box>
            }
          />
        </Card>
      </Box>
    );
  }
  return (
    <SessionProvider session={data} refresh={() => queryClient.invalidateQueries({ queryKey: ['me'] })}>
      <AppShell>
        {data.tenant.status === 'SUSPENDED' && (
          <Alert severity="error" icon={<CreditCardOffOutlinedIcon />} sx={{ mb: 3 }}>
            This company account is suspended. Data is read-only until billing is settled.
          </Alert>
        )}
        {data.tenant.status === 'PAST_DUE' && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            A payment is overdue. Please settle it to avoid suspension.
          </Alert>
        )}
        {children}
      </AppShell>
    </SessionProvider>
  );
}
