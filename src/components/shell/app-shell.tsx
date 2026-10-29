'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import MoreTimeOutlinedIcon from '@mui/icons-material/MoreTimeOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import SmartphoneOutlinedIcon from '@mui/icons-material/SmartphoneOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import TodayOutlinedIcon from '@mui/icons-material/TodayOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { BrandMark } from '@/components/brand/brand-mark';
import { TenantAvatar } from '@/components/brand/tenant-avatar';
import { AppLoader } from '@/components/common/app-loader';
import { ThemeModeToggle } from '@/components/common/theme-mode-toggle';
import { useSnackbar } from '@/components/common/snackbar';
import { PRODUCT } from '@/lib/brand';
import { api, authAction } from '@/lib/http';
import { useSession } from '@/lib/session';
import { AccountMenu } from './account-menu';
import { NAV } from './nav-items';
import { SidebarLayout, type ShellNavSection } from './sidebar-layout';

const ICONS: Record<string, ReactNode> = {
  dashboard: <DashboardOutlinedIcon />,
  map: <MapOutlinedIcon />,
  people: <PeopleAltOutlinedIcon />,
  phone: <SmartphoneOutlinedIcon />,
  upload: <UploadFileOutlinedIcon />,
  today: <TodayOutlinedIcon />,
  grid: <GridViewOutlinedIcon />,
  leave: <EventBusyOutlinedIcon />,
  leaveSetup: <EventNoteOutlinedIcon />,
  timer: <MoreTimeOutlinedIcon />,
  money: <PaymentsOutlinedIcon />,
  download: <FileDownloadOutlinedIcon />,
  business: <BusinessOutlinedIcon />,
  place: <PlaceOutlinedIcon />,
  schedule: <ScheduleOutlinedIcon />,
  event: <CalendarMonthOutlinedIcon />,
  admin: <AdminPanelSettingsOutlinedIcon />,
  settings: <SettingsOutlinedIcon />,
};

interface Company {
  readonly tenantId: string;
  readonly name: string;
  readonly role: string;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { can, has, isAdmin, session } = useSession();
  const { notifyError } = useSnackbar();
  const router = useRouter();
  const [menuOpened, setMenuOpened] = useState(false);
  const [leaving, setLeaving] = useState<string | null>(null);
  const companies = useQuery({ queryKey: ['companies'], queryFn: () => api.get<Company[]>('/auth/companies'), enabled: menuOpened, staleTime: 300_000 });
  const others = (companies.data ?? []).filter((c) => c.tenantId !== session.tenant.id);

  const sections = useMemo<ShellNavSection[]>(
    () =>
      NAV.map((section) => ({
        title: section.title,
        items: section.items
          .filter((item) => (item.adminOnly ? isAdmin : !item.module || can(item.module)) && (!item.feature || has(item.feature)))
          .map((item) => ({ label: item.label, href: item.href, icon: ICONS[item.icon] })),
      })).filter((s) => s.items.length > 0),
    [can, has, isAdmin],
  );

  const logout = async () => {
    setLeaving('Signing you out');
    try {
      await authAction('tenant', 'logout');
    } catch (error: unknown) {
      setLeaving(null);
      notifyError(error);
      return;
    }
    // The cache is cleared on the next sign-in, so no one sees this user's data.
    router.replace('/login');
  };
  const switchCompany = async (company: Company) => {
    setLeaving(`Opening ${company.name}`);
    try {
      await authAction('tenant', 'switch-company', { tenantId: company.tenantId });
      window.location.assign('/dashboard');
    } catch (error: unknown) {
      setLeaving(null);
      notifyError(error);
    }
  };

  const header = (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
      <TenantAvatar name={session.tenant.displayName} logoUrl={session.tenant.branding.logoUrl} size={38} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.25 }} noWrap title={session.tenant.displayName}>
          {session.tenant.displayName}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap component="div">
          {session.role.name} workspace
        </Typography>
      </Box>
    </Stack>
  );
  const footer = (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
      <BrandMark size={18} />
      <Typography variant="caption" sx={{ fontWeight: 600 }}>Powered by {PRODUCT.name}</Typography>
    </Stack>
  );

  return (
    <>
      {leaving && <AppLoader label={leaving} />}
      <SidebarLayout
        header={header}
        footer={footer}
        sections={sections}
        topbarEnd={
          <>
            <ThemeModeToggle />
            <AccountMenu name={session.user.fullName} email={session.user.email} role={session.role.name} onOpen={() => setMenuOpened(true)} onSignOut={logout}>
              {(close) =>
                companies.isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}><CircularProgress size={18} /></Box>
                ) : others.length > 0 ? (
                  <Box>
                    <Typography variant="overline" color="text.secondary" component="div" sx={{ px: 2, pt: 1 }}>Switch company</Typography>
                    {others.map((c) => (
                      <MenuItem key={c.tenantId} onClick={() => { close(); void switchCompany(c); }}>
                        <ListItemIcon><SwapHorizIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary={c.name} secondary={c.role} slotProps={{ secondary: { variant: 'caption' } }} />
                      </MenuItem>
                    ))}
                    <Divider />
                  </Box>
                ) : null
              }
            </AccountMenu>
          </>
        }
      >
        {children}
      </SidebarLayout>
    </>
  );
}
