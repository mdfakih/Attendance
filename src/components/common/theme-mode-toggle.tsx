'use client';

import { useState, type ReactNode } from 'react';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import SettingsBrightnessOutlinedIcon from '@mui/icons-material/SettingsBrightnessOutlined';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import { useColorScheme } from '@mui/material/styles';

type Mode = 'light' | 'dark' | 'system';

const OPTIONS: ReadonlyArray<{ mode: Mode; label: string; icon: ReactNode }> = [
  { mode: 'light', label: 'Light', icon: <LightModeOutlinedIcon fontSize="small" /> },
  { mode: 'dark', label: 'Dark', icon: <DarkModeOutlinedIcon fontSize="small" /> },
  { mode: 'system', label: 'Match device', icon: <SettingsBrightnessOutlinedIcon fontSize="small" /> },
];

/** Icon button in top bars that opens Light / Dark / Match device. */
export function ThemeModeToggle() {
  const { mode, systemMode, setMode } = useColorScheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const resolved = mode === 'system' ? systemMode : mode;
  return (
    <>
      <Tooltip title="Appearance">
        <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="Change appearance" aria-haspopup="menu">
          {resolved === 'dark' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        {OPTIONS.map((o) => (
          <MenuItem key={o.mode} selected={mode === o.mode} onClick={() => { setMode(o.mode); setAnchor(null); }}>
            <ListItemIcon>{o.icon}</ListItemIcon>
            <ListItemText primary={o.label} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/** Inline segmented control, e.g. inside an account menu. */
export function ThemeModeSegmented() {
  const { mode, setMode } = useColorScheme();
  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      size="small"
      value={mode ?? 'system'}
      onChange={(_, value: Mode | null) => value && setMode(value)}
      aria-label="Appearance"
      sx={{ '& .MuiToggleButton-root': { textTransform: 'none', gap: 0.75, fontWeight: 600, py: 0.5 } }}
    >
      {OPTIONS.map((o) => (
        <ToggleButton key={o.mode} value={o.mode} aria-label={o.label}>
          {o.icon}
          {o.mode === 'system' ? 'Auto' : o.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
