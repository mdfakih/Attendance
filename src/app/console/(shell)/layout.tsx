'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { BrandLogo } from '@/components/brand/brand-mark';
import { AppLoader } from '@/components/common/app-loader';
import { EmptyState } from '@/components/common/loading';
import { useSnackbar } from '@/components/common/snackbar';
import { ThemeModeToggle } from '@/components/common/theme-mode-toggle';
import { ConsoleSessionProvider, PLATFORM_ROLE_LABEL, useConsoleMeQuery } from '@/components/console/console-session';
import { AccountMenu } from '@/components/shell/account-menu';
import { SidebarLayout, type ShellNavSection } from '@/components/shell/sidebar-layout';
import { authAction, errorMessage } from '@/lib/http';

const SECTIONS: ShellNavSection[] = [
  {
    title: 'Platform',
    items: [
      { href: '/console', label: 'Overview', icon: <InsightsOutlinedIcon /> },
      { href: '/console/tenants', label: 'Clients', icon: <ApartmentOutlinedIcon /> },
      { href: '/console/plans', label: 'Plans & pricing', icon: <SellOutlinedIcon /> },
    ],
  },
];

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const me = useConsoleMeQuery();
  const { notifyError } = useSnackbar();
  const [leaving, setLeaving] = useState(false);
  const logout = async () => {
    setLeaving(true);
    try {
      await authAction('platform', 'logout');
    } catch (error: unknown) {
      setLeaving(false);
      notifyError(error);
      return;
    }
    // The cache is cleared on the next sign-in, so no one sees this user's data.
    router.replace('/console/login');
  };
  if (me.isLoading) return <AppLoader label="Opening the console" />;
  if (me.error || !me.data) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2, bgcolor: 'background.default' }}>
        <Card sx={{ maxWidth: 460, width: '100%' }}>
          <EmptyState
            icon={<ReportProblemOutlinedIcon />}
            title="We couldn’t open the console"
            description={errorMessage(me.error ?? new Error('Could not load your account.'))}
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" onClick={() => me.refetch()}>Try again</Button>
                <Button component={Link} href="/console/login">Sign in again</Button>
              </Box>
            }
          />
        </Card>
      </Box>
    );
  }
  const role = PLATFORM_ROLE_LABEL[me.data.role] ?? me.data.role;
  return (
    <ConsoleSessionProvider me={me.data}>
      {leaving && <AppLoader label="Signing you out" />}
      <SidebarLayout
        header={<BrandLogo size={34} caption="Platform console" />}
        footer={
          <Typography variant="caption" color="text.secondary" component="div">
            Signed in as <strong>{role}</strong>
          </Typography>
        }
        sections={SECTIONS}
        topbarEnd={
          <>
            <ThemeModeToggle />
            <AccountMenu name={me.data.fullName} email={me.data.email} role={role} onSignOut={logout} />
          </>
        }
      >
        {children}
      </SidebarLayout>
    </ConsoleSessionProvider>
  );
}
