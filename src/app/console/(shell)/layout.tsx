'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { authAction, consoleApi } from '@/lib/http';

const TABS = [
  { href: '/console', label: 'Overview' },
  { href: '/console/tenants', label: 'Clients' },
  { href: '/console/plans', label: 'Plans' },
];

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const me = useQuery({ queryKey: ['console-me'], queryFn: () => consoleApi.get<{ fullName: string; role: string }>('/auth/me') });
  const active = TABS.filter((t) => pathname === t.href || (t.href !== '/console' && pathname.startsWith(t.href))).pop()?.href ?? '/console';
  const logout = async () => {
    await authAction('platform', 'logout');
    router.replace('/console/login');
  };
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mr: 3 }}>Attendance · Superadmin</Typography>
          <Tabs value={active} sx={{ flexGrow: 1 }}>
            {TABS.map((t) => <Tab key={t.href} value={t.href} label={t.label} component={Link} href={t.href} />)}
          </Tabs>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>{me.data?.fullName} · {me.data?.role}</Typography>
          <Button onClick={logout}>Sign out</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ py: 3 }}>{children}</Container>
    </Box>
  );
}
