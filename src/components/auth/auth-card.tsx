'use client';

import { useEffect, type ReactNode } from 'react';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined';
import WhereToVoteOutlinedIcon from '@mui/icons-material/WhereToVoteOutlined';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { BrandLogo, BrandMark } from '@/components/brand/brand-mark';
import { ThemeModeToggle } from '@/components/common/theme-mode-toggle';
import { PRODUCT, pageTitle } from '@/lib/brand';

const HIGHLIGHTS = {
  employer: {
    headline: 'Know who’s at work, and what they’ve earned — in real time.',
    points: [
      { icon: <WhereToVoteOutlinedIcon />, text: 'Geofenced punches with a face check from each employee’s phone' },
      { icon: <FingerprintIcon />, text: 'Daily attendance, leave and extra time in one place' },
      { icon: <AccountBalanceWalletOutlinedIcon />, text: 'Earned pay that updates as the month goes on' },
    ],
  },
  console: {
    headline: 'Run every client from one console.',
    points: [
      { icon: <ApartmentOutlinedIcon />, text: 'Onboard clients and invite their first admin in minutes' },
      { icon: <ToggleOnOutlinedIcon />, text: 'Switch modules on or off per client, and lock them' },
      { icon: <PaletteOutlinedIcon />, text: 'Brand each client’s dashboard and employee app' },
    ],
  },
} as const;

interface AuthCardProps {
  readonly title: string;
  readonly subtitle?: ReactNode;
  readonly children: ReactNode;
  readonly variant?: keyof typeof HIGHLIGHTS;
}

/** Split sign-in layout: brand story on the left (desktop), the form on the right. */
export function AuthCard({ title, subtitle, children, variant = 'employer' }: AuthCardProps) {
  const story = HIGHLIGHTS[variant];
  useEffect(() => {
    document.title = pageTitle(title);
  }, [title]);
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(380px, 5fr) 7fr' }, bgcolor: 'background.default' }}>
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 5,
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(150deg, var(--mui-palette-primary-dark) 0%, var(--mui-palette-primary-main) 55%, var(--mui-palette-secondary-main) 130%)',
        }}
      >
        <Box aria-hidden sx={{ position: 'absolute', width: 520, height: 520, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.14)', right: -220, top: -160 }} />
        <Box aria-hidden sx={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', left: -140, bottom: -120 }} />
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', position: 'relative' }}>
          <Box sx={{ p: 0.5, borderRadius: 3.5, bgcolor: 'rgba(255,255,255,0.16)' }}>
            <BrandMark size={34} />
          </Box>
          <Typography sx={{ fontFamily: 'var(--font-display), inherit', fontWeight: 800, fontSize: '1.3rem' }}>{PRODUCT.name}</Typography>
          {variant === 'console' && (
            <Typography variant="caption" sx={{ px: 1, py: 0.25, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.18)', fontWeight: 700, letterSpacing: '0.04em' }}>
              CONSOLE
            </Typography>
          )}
        </Stack>
        <Box sx={{ position: 'relative', maxWidth: 460 }}>
          <Typography variant="h3" sx={{ fontSize: '2.1rem', lineHeight: 1.2, mb: 3 }}>{story.headline}</Typography>
          <Stack spacing={2}>
            {story.points.map((p) => (
              <Stack key={p.text} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,0.16)', flexShrink: 0, '& svg': { fontSize: 20 } }}>{p.icon}</Box>
                <Typography sx={{ opacity: 0.92 }}>{p.text}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.75, position: 'relative' }}>{PRODUCT.tagline}.</Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', px: { xs: 2, sm: 4 }, pt: 2 }}>
          <Box sx={{ display: { md: 'none' } }}>
            <BrandLogo size={30} caption={variant === 'console' ? 'Console' : undefined} />
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <ThemeModeToggle />
          </Box>
        </Stack>
        <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', px: { xs: 2, sm: 4 }, py: 4 }}>
          <Box sx={{ width: '100%', maxWidth: 400 }}>
            <Typography variant="h4" component="h1" sx={{ mb: 0.75 }}>{title}</Typography>
            {subtitle && (
              <Typography color="text.secondary" component="div" sx={{ mb: 3.5 }}>
                {subtitle}
              </Typography>
            )}
            {!subtitle && <Box sx={{ mb: 3 }} />}
            {children}
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', pb: 2.5 }}>
          © {new Date().getFullYear()} {PRODUCT.name}
        </Typography>
      </Box>
    </Box>
  );
}
