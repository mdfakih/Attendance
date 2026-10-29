'use client';

import { useState } from 'react';
import Avatar from '@mui/material/Avatar';
import { initials } from '@/lib/brand';

interface TenantAvatarProps {
  readonly name: string;
  readonly logoUrl?: string | null;
  /** Background when there is no logo; defaults to the active primary colour. */
  readonly color?: string;
  readonly size?: number;
}

/** A client's logo, or their initials on their brand colour when there is none (or it fails to load). */
export function TenantAvatar({ name, logoUrl, color, size = 40 }: TenantAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showLogo = !!logoUrl && failedUrl !== logoUrl;
  return (
    <Avatar
      variant="rounded"
      src={showLogo ? logoUrl : undefined}
      alt={name}
      slotProps={{ img: { onError: () => setFailedUrl(logoUrl ?? null), referrerPolicy: 'no-referrer' } }}
      sx={{
        width: size,
        height: size,
        borderRadius: `${Math.round(size * 0.28)}px`,
        fontSize: size * 0.38,
        color: showLogo ? 'text.primary' : '#fff',
        bgcolor: showLogo ? 'background.paper' : (color ?? 'primary.main'),
        border: showLogo ? 1 : 0,
        borderColor: 'divider',
        '& img': { objectFit: 'contain', p: size > 40 ? 0.75 : 0.25 },
      }}
    >
      {initials(name)}
    </Avatar>
  );
}
