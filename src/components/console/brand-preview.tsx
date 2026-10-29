'use client';

import { useState } from 'react';
import type { Branding } from '@attendance/contracts';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { TenantAvatar } from '@/components/brand/tenant-avatar';
import { contrastText, readableOnDark, SURFACES } from '@/lib/theme';

interface Palette {
  readonly primary: string;
  readonly accent: string;
  readonly onPrimary: string;
  readonly bg: string;
  readonly paper: string;
  readonly text: string;
  readonly muted: string;
  readonly line: string;
}

function paletteFor(branding: Branding, mode: 'light' | 'dark'): Palette {
  const s = SURFACES[mode];
  const primary = mode === 'light' ? branding.primaryColor : readableOnDark(branding.primaryColor);
  const accent = mode === 'light' ? branding.accentColor : readableOnDark(branding.accentColor);
  return { primary, accent, onPrimary: contrastText(primary), bg: s.background, paper: s.paper, text: s.text, muted: s.muted, line: s.divider };
}


function Bar({ w, c, h = 6 }: { w: string | number; c: string; h?: number }) {
  return <Box sx={{ width: w, height: h, borderRadius: 4, bgcolor: c }} />;
}

function WebMock({ p, branding, name }: { p: Palette; branding: Branding; name: string }) {
  return (
    <Box sx={{ borderRadius: 2.5, overflow: 'hidden', border: `1px solid ${p.line}`, bgcolor: p.bg, boxShadow: '0 10px 30px rgba(15,23,42,0.12)' }} aria-hidden>
      <Stack direction="row" spacing={0.6} sx={{ px: 1.25, py: 0.9, bgcolor: p.paper, borderBottom: `1px solid ${p.line}` }}>
        {['#F87171', '#FBBF24', '#34D399'].map((c) => <Box key={c} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c }} />)}
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: '34% 1fr', minHeight: 210 }}>
        <Box sx={{ bgcolor: p.paper, borderRight: `1px solid ${p.line}`, p: 1.25 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 1.5 }}>
            <TenantAvatar name={name} logoUrl={branding.logoUrl} color={p.primary} size={22} />
            <Typography sx={{ fontSize: 10, fontWeight: 800, color: p.text }} noWrap>{name}</Typography>
          </Stack>
          {['Dashboard', 'Employees', 'Attendance', 'Settings'].map((item, i) => (
            <Box key={item} sx={{ px: 0.75, py: 0.6, mb: 0.4, borderRadius: 1, bgcolor: i === 0 ? alpha(p.primary, 0.14) : 'transparent' }}>
              <Typography sx={{ fontSize: 9.5, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? p.primary : p.muted }}>{item}</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ p: 1.5 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: p.text, mb: 1 }}>Dashboard</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75, mb: 1.25 }}>
            {[p.primary, p.accent].map((c, i) => (
              <Box key={i} sx={{ p: 0.9, borderRadius: 1.25, bgcolor: p.paper, border: `1px solid ${p.line}` }}>
                <Box sx={{ width: 14, height: 14, borderRadius: 0.75, bgcolor: alpha(c, 0.16), mb: 0.6, display: 'grid', placeItems: 'center' }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: c }} />
                </Box>
                <Bar w="60%" c={p.line} h={4} />
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: p.text, mt: 0.4 }}>{i === 0 ? '128' : '96%'}</Typography>
              </Box>
            ))}
          </Box>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Box sx={{ px: 1.1, py: 0.5, borderRadius: 1, bgcolor: p.primary }}>
              <Typography sx={{ fontSize: 9, fontWeight: 700, color: p.onPrimary }}>Add employee</Typography>
            </Box>
            <Box sx={{ px: 0.9, py: 0.4, borderRadius: 1, bgcolor: alpha(p.accent, 0.16) }}>
              <Typography sx={{ fontSize: 9, fontWeight: 700, color: p.accent }}>3 pending</Typography>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

function PhoneMock({ p, branding, name }: { p: Palette; branding: Branding; name: string }) {
  return (
    <Box sx={{ width: 168, flexShrink: 0, borderRadius: 4.5, p: 0.75, bgcolor: '#0B0F19', boxShadow: '0 10px 30px rgba(15,23,42,0.22)' }} aria-hidden>
      <Box sx={{ borderRadius: 3.75, overflow: 'hidden', bgcolor: p.bg, height: 300, display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', px: 1.25, pt: 1.5, pb: 1 }}>
          <TenantAvatar name={name} logoUrl={branding.logoUrl} color={p.primary} size={20} />
          <Typography sx={{ fontSize: 10, fontWeight: 800, color: p.text }} noWrap>{name}</Typography>
        </Stack>
        <Box sx={{ px: 1.25 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: p.text }}>Hello, Priya</Typography>
          <Typography sx={{ fontSize: 8.5, color: p.muted, mb: 1 }}>Monday, 3 November</Typography>
          <Box sx={{ p: 1.1, borderRadius: 2, bgcolor: p.paper, border: `1px solid ${p.line}` }}>
            <Box sx={{ display: 'inline-block', px: 0.75, py: 0.2, borderRadius: 1, bgcolor: alpha(p.accent, 0.16), mb: 0.75 }}>
              <Typography sx={{ fontSize: 8, fontWeight: 700, color: p.accent }}>Not punched yet</Typography>
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: p.text, lineHeight: 1.1 }}>0h 00m</Typography>
            <Typography sx={{ fontSize: 8, color: p.muted, mb: 1 }}>worked today · 09:00–18:00</Typography>
            <Box sx={{ py: 0.8, borderRadius: 1.5, bgcolor: p.primary, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 10, fontWeight: 800, color: p.onPrimary }}>Punch in</Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" sx={{ justifyContent: 'space-around', py: 0.9, bgcolor: p.paper, borderTop: `1px solid ${p.line}` }}>
          {['Home', 'Attendance', 'Profile'].map((t, i) => (
            <Stack key={t} spacing={0.3} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 22, height: 10, borderRadius: 2, bgcolor: i === 0 ? alpha(p.primary, 0.2) : 'transparent', display: 'grid', placeItems: 'center' }}>
                <Box sx={{ width: 6, height: 6, borderRadius: 0.5, bgcolor: i === 0 ? p.primary : p.muted }} />
              </Box>
              <Typography sx={{ fontSize: 7, fontWeight: i === 0 ? 800 : 500, color: i === 0 ? p.primary : p.muted }}>{t}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

interface BrandPreviewProps {
  readonly branding: Branding;
  readonly companyName: string;
}

/** Live preview of a client's dashboard and employee app in their colours. */
export function BrandPreview({ branding, companyName }: BrandPreviewProps) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const p = paletteFor(branding, mode);
  const name = companyName.trim() || 'Your company';
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="overline" color="text.secondary">Live preview</Typography>
        <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v: 'light' | 'dark' | null) => v && setMode(v)} sx={{ '& .MuiToggleButton-root': { py: 0.25, px: 1.25, textTransform: 'none', fontWeight: 600 } }}>
          <ToggleButton value="light">Light</ToggleButton>
          <ToggleButton value="dark">Dark</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Box sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: 3, bgcolor: mode === 'light' ? '#E9EDF5' : '#05070C', display: 'flex', gap: 2, alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' } }}>
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <Typography variant="caption" sx={{ color: mode === 'light' ? 'rgba(15,23,42,0.6)' : 'rgba(230,233,240,0.6)', fontWeight: 700, display: 'block', mb: 0.75 }}>Web dashboard</Typography>
          <WebMock p={p} branding={branding} name={name} />
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: mode === 'light' ? 'rgba(15,23,42,0.6)' : 'rgba(230,233,240,0.6)', fontWeight: 700, display: 'block', mb: 0.75 }}>Employee app</Typography>
          <PhoneMock p={p} branding={branding} name={name} />
        </Box>
      </Box>
    </Box>
  );
}
