'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { FetchIndicator } from '@/components/common/fetch-indicator';
import { tint } from '@/lib/tone';
import { activeHref } from './nav-match';

export const DRAWER_WIDTH = 272;

export interface ShellNavItem {
  readonly label: string;
  readonly href: string;
  readonly icon: ReactNode;
}

export interface ShellNavSection {
  readonly title?: string;
  readonly items: readonly ShellNavItem[];
}


interface NavProps {
  readonly header: ReactNode;
  readonly footer?: ReactNode;
  readonly sections: readonly ShellNavSection[];
  readonly active: string | null;
  readonly onNavigate?: () => void;
}

function SidebarNav({ header, footer, sections, active, onNavigate }: NavProps) {
  return (
    <Stack sx={{ height: '100%', bgcolor: 'background.paper' }}>
      <Box sx={{ px: 2.25, minHeight: 72, display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>{header}</Box>
      <Box component="nav" aria-label="Main" sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1.5 }}>
        {sections.map((section, i) => (
          <List
            key={section.title ?? i}
            dense
            disablePadding
            sx={{ mb: 1.5 }}
            subheader={
              section.title ? (
                <Typography variant="overline" component="div" color="text.secondary" sx={{ px: 1.5, pt: 0.5, pb: 0.25, opacity: 0.8 }}>
                  {section.title}
                </Typography>
              ) : undefined
            }
          >
            {section.items.map((item) => {
              const selected = item.href === active;
              return (
                <ListItemButton
                  key={item.href}
                  component={Link}
                  href={item.href}
                  selected={selected}
                  onClick={onNavigate}
                  aria-current={selected ? 'page' : undefined}
                  sx={(t) => ({
                    mb: 0.25,
                    py: 0.85,
                    color: 'text.secondary',
                    '& .MuiListItemIcon-root': { color: 'inherit', minWidth: 34 },
                    '& .MuiSvgIcon-root': { fontSize: 20 },
                    '&:hover': { color: 'text.primary' },
                    '&.Mui-selected, &.Mui-selected:hover': { bgcolor: tint(t, 'primary', 0.1), color: 'primary.main' },
                  })}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontWeight: selected ? 700 : 500, fontSize: '0.875rem' } } }} />
                </ListItemButton>
              );
            })}
          </List>
        ))}
      </Box>
      {footer && <Box sx={{ px: 2.25, py: 1.75, borderTop: 1, borderColor: 'divider' }}>{footer}</Box>}
    </Stack>
  );
}

interface SidebarLayoutProps {
  readonly header: ReactNode;
  readonly footer?: ReactNode;
  readonly sections: readonly ShellNavSection[];
  /** Right side of the top bar: appearance, account menu… */
  readonly topbarEnd: ReactNode;
  readonly children: ReactNode;
}

export function SidebarLayout({ header, footer, sections, topbarEnd, children }: SidebarLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const active = activeHref(pathname, sections.flatMap((s) => s.items.map((i) => i.href)));
  const activeSection = sections.find((s) => s.items.some((i) => i.href === active));
  const activeItem = activeSection?.items.find((i) => i.href === active);
  const nav = { header, footer, sections, active };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        sx={(t) => ({
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          borderBottom: 1,
          borderColor: 'divider',
          backdropFilter: 'saturate(180%) blur(10px)',
          backgroundColor: `rgba(${t.vars?.palette.background.defaultChannel} / 0.82)`,
        })}
      >
        <Toolbar sx={{ minHeight: { xs: 60, md: 64 }, gap: 1 }}>
          <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' } }} aria-label="Open menu">
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {activeSection?.title && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2, fontWeight: 600 }} noWrap>
                {activeSection.title}
              </Typography>
            )}
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }} noWrap>
              {activeItem?.label ?? ''}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            {topbarEnd}
          </Stack>
        </Toolbar>
        <FetchIndicator />
      </AppBar>
      <Box component="aside" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, borderRight: 0 } }}
        >
          <SidebarNav {...nav} onNavigate={() => setMobileOpen(false)} />
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', borderRight: 1, borderColor: 'divider' } }}
        >
          <SidebarNav {...nav} />
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <Toolbar sx={{ minHeight: { xs: 60, md: 64 } }} />
        <Box sx={{ px: { xs: 2, sm: 3, lg: 4 }, py: { xs: 2.5, md: 3.5 }, maxWidth: 1480, mx: 'auto' }}>{children}</Box>
      </Box>
    </Box>
  );
}
