'use client';

import { useState, type ReactNode } from 'react';
import LogoutIcon from '@mui/icons-material/Logout';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ThemeModeSegmented } from '@/components/common/theme-mode-toggle';
import { initials } from '@/lib/brand';

interface AccountMenuProps {
  readonly name: string;
  readonly email?: string;
  readonly role?: string;
  /** Extra items between the header and "Appearance" (e.g. switch company). */
  readonly children?: (close: () => void) => ReactNode;
  readonly onOpen?: () => void;
  readonly onSignOut: () => void;
}

export function AccountMenu({ name, email, role, children, onOpen, onSignOut }: AccountMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  return (
    <>
      <ButtonBase
        onClick={(e) => { setAnchor(e.currentTarget); onOpen?.(); }}
        aria-label="Account menu"
        aria-haspopup="menu"
        sx={{ borderRadius: 2.5, p: 0.5, pr: { xs: 0.5, sm: 1.25 }, gap: 1, '&:hover': { bgcolor: 'action.hover' } }}
      >
        <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: 'primary.main', color: 'primary.contrastText' }}>{initials(name)}</Avatar>
        <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'left', maxWidth: 160 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>{name}</Typography>
          {role && <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2, display: 'block' }} noWrap>{role}</Typography>}
        </Box>
      </ButtonBase>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 300, mt: 1 } } }}
      >
        <Stack direction="row" spacing={1.5} sx={{ px: 2, py: 1.5, alignItems: 'center' }}>
          <Avatar sx={{ width: 40, height: 40, fontSize: 15, bgcolor: 'primary.main', color: 'primary.contrastText' }}>{initials(name)}</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap>{name}</Typography>
            {email && <Typography variant="caption" color="text.secondary" component="div" noWrap>{email}</Typography>}
            {role && <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700 }}>{role}</Typography>}
          </Box>
        </Stack>
        <Divider />
        {children?.(close)}
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="overline" color="text.secondary" component="div" sx={{ mb: 0.75 }}>Appearance</Typography>
          <ThemeModeSegmented />
        </Box>
        <Divider />
        <MenuItem onClick={() => { close(); onSignOut(); }} sx={{ color: 'error.main', my: 0.5 }}>
          <ListItemIcon sx={{ color: 'inherit' }}><LogoutIcon fontSize="small" /></ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>
    </>
  );
}
