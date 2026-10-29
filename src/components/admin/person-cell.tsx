'use client';

import Link from 'next/link';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { initials } from '@/lib/brand';
import { tint } from '@/lib/tone';

interface PersonCellProps {
  readonly name: string;
  readonly href?: string;
  /** Second line, e.g. employee code or email. */
  readonly caption?: string | null;
  readonly photoUrl?: string | null;
  readonly size?: number;
}

/** Avatar + name (+ caption) used in tables and lists. */
export function PersonCell({ name, href, caption, photoUrl, size = 30 }: PersonCellProps) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Avatar
        src={photoUrl ?? undefined}
        sx={(t) => ({ width: size, height: size, fontSize: size * 0.4, color: 'primary.main', bgcolor: tint(t, 'primary', 0.12) })}
      >
        {initials(name)}
      </Avatar>
      <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
        {href ? (
          <Typography component={Link} href={href} variant="body2" color="primary" sx={{ fontWeight: 600, display: 'block', '&:hover': { textDecoration: 'underline' } }} noWrap>
            {name}
          </Typography>
        ) : (
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{name}</Typography>
        )}
        {caption && <Typography variant="caption" color="text.secondary" component="div" noWrap>{caption}</Typography>}
      </Box>
    </Stack>
  );
}
