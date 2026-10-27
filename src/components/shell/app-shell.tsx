'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BusinessIcon from '@mui/icons-material/Business';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DownloadIcon from '@mui/icons-material/Download';
import EventIcon from '@mui/icons-material/Event';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import GridOnIcon from '@mui/icons-material/GridOn';
import MapIcon from '@mui/icons-material/Map';
import MenuIcon from '@mui/icons-material/Menu';
import PaymentsIcon from '@mui/icons-material/Payments';
import PeopleIcon from '@mui/icons-material/People';
import PlaceIcon from '@mui/icons-material/Place';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import TimerIcon from '@mui/icons-material/Timer';
import TodayIcon from '@mui/icons-material/Today';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { api, authAction } from '@/lib/http';
import { useSession } from '@/lib/session';
import { NAV } from './nav-items';

const DRAWER_WIDTH = 256;

const ICONS: Record<string, ReactNode> = {
  dashboard: <DashboardIcon />,
  map: <MapIcon />,
  people: <PeopleIcon />,
  phone: <SmartphoneIcon />,
  upload: <UploadFileIcon />,
  today: <TodayIcon />,
  grid: <GridOnIcon />,
  leave: <EventBusyIcon />,
  timer: <TimerIcon />,
  money: <PaymentsIcon />,
  download: <DownloadIcon />,
  business: <BusinessIcon />,
  place: <PlaceIcon />,
  schedule: <ScheduleIcon />,
  event: <EventIcon />,
  admin: <AdminPanelSettingsIcon />,
  settings: <SettingsIcon />,
};

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { can, has, isAdmin, session } = useSession();
  return (
    <Box sx={{ overflowY: 'auto' }}>
      <Toolbar sx={{ px: 2 }}>
        <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
          {session.tenant.displayName}
        </Typography>
      </Toolbar>
      <Divider />
      {NAV.map((section, i) => {
        const items = section.items.filter((item) => (item.adminOnly ? isAdmin : !item.module || can(item.module)) && (!item.feature || has(item.feature)));
        if (items.length === 0) return null;
        return (
          <List key={i} dense subheader={section.title ? <ListSubheader disableSticky>{section.title}</ListSubheader> : undefined}>
            {items.map((item) => (
              <ListItemButton key={item.href} component={Link} href={item.href} selected={pathname === item.href || (item.href !== '/employees' && pathname.startsWith(`${item.href}/`))} onClick={onNavigate} sx={{ mx: 1, borderRadius: 2 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>{ICONS[item.icon]}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        );
      })}
    </Box>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const { session } = useSession();
  const router = useRouter();
  const companies = useQuery({ queryKey: ['companies'], queryFn: () => api.get<Array<{ tenantId: string; name: string; role: string }>>('/auth/companies'), enabled: !!menuAnchor });

  const logout = async () => {
    await authAction('tenant', 'logout');
    router.replace('/login');
  };
  const switchCompany = async (tenantId: string) => {
    await authAction('tenant', 'switch-company', { tenantId });
    window.location.assign('/dashboard');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1, display: { md: 'none' } }} aria-label="Open menu">
            <MenuIcon />
          </IconButton>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, flexGrow: 1 }}>
            Attendance
          </Typography>
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Account menu">
            <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>{session.user.fullName.slice(0, 1)}</Avatar>
          </IconButton>
          <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
            <MenuItem disabled>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{session.user.fullName}</Typography>
                <Typography variant="caption" color="text.secondary">{session.user.email} · {session.role.name}</Typography>
              </Box>
            </MenuItem>
            <Divider />
            {(companies.data ?? []).filter((c) => c.tenantId !== session.tenant.id).map((c) => (
              <MenuItem key={c.tenantId} onClick={() => switchCompany(c.tenantId)}>Switch to {c.name}</MenuItem>
            ))}
            <MenuItem onClick={logout}>Sign out</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>
          <NavList onNavigate={() => setMobileOpen(false)} />
        </Drawer>
        <Drawer variant="permanent" open sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}>
          <NavList />
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, minWidth: 0 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
