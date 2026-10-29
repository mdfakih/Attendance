'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { tint, type Tone } from '@/lib/tone';

interface StatCardProps {
  readonly label: string;
  readonly value: ReactNode;
  readonly icon?: ReactNode;
  readonly tone?: Tone;
  readonly caption?: ReactNode;
  readonly href?: string;
  /** Draws attention when the value needs action (e.g. pending approvals). */
  readonly highlight?: boolean;
}

export function StatCard({ label, value, icon, tone = 'primary', caption, href, highlight }: StatCardProps) {
  const body = (
    <CardContent>
      <Stack direction="row" spacing={1.75} sx={{ alignItems: 'flex-start' }}>
        {icon && (
          <Box sx={(t) => ({ width: 40, height: 40, flexShrink: 0, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: `${tone}.main`, bgcolor: tint(t, tone, 0.12), '& svg': { fontSize: 22 } })}>
            {icon}
          </Box>
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }} noWrap>
            {label}
          </Typography>
          <Typography sx={{ fontFamily: 'var(--font-display), inherit', fontWeight: 800, fontSize: '1.65rem', lineHeight: 1.2, letterSpacing: '-0.02em', color: highlight ? `${tone}.main` : 'text.primary' }}>
            {value}
          </Typography>
          {caption && (
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.25 }}>
              {caption}
            </Typography>
          )}
        </Box>
        {href && <ArrowForwardIcon className="stat-arrow" sx={{ fontSize: 18, color: 'text.disabled', transition: 'transform .15s, color .15s' }} />}
      </Stack>
    </CardContent>
  );
  return (
    <Card sx={(t) => ({ height: '100%', ...(highlight && { borderColor: tint(t, tone, 0.45), bgcolor: tint(t, tone, 0.04) }) })}>
      {href ? (
        <CardActionArea component={Link} href={href} sx={{ height: '100%', '&:hover .stat-arrow': { transform: 'translateX(3px)', color: 'primary.main' } }}>
          {body}
        </CardActionArea>
      ) : (
        body
      )}
    </Card>
  );
}
