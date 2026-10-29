'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { pageTitle } from '@/lib/brand';

export interface Crumb {
  readonly label: string;
  readonly href?: string;
}

interface PageHeaderProps {
  readonly title: string;
  readonly subtitle?: ReactNode;
  readonly actions?: ReactNode;
  readonly breadcrumbs?: readonly Crumb[];
  /** Shown before the title, e.g. a client logo. */
  readonly leading?: ReactNode;
}

export function PageHeader({ title, subtitle, actions, breadcrumbs, leading }: PageHeaderProps) {
  useEffect(() => {
    document.title = pageTitle(title);
  }, [title]);
  return (
    <Box sx={{ mb: 3 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs separator={<NavigateNextIcon sx={{ fontSize: 16 }} />} sx={{ mb: 1, '& .MuiBreadcrumbs-li': { fontSize: '0.8125rem' } }}>
          {breadcrumbs.map((c) =>
            c.href ? (
              <Typography key={c.label} component={Link} href={c.href} variant="body2" color="text.secondary" sx={{ '&:hover': { color: 'primary.main' } }}>
                {c.label}
              </Typography>
            ) : (
              <Typography key={c.label} variant="body2" color="text.primary" sx={{ fontWeight: 600 }}>
                {c.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>
      )}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0 }}>
          {leading}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.5rem', md: '1.75rem' } }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
        {actions && (
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
            {actions}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
