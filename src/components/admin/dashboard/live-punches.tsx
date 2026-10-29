'use client';

import Link from 'next/link';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import SensorsOutlinedIcon from '@mui/icons-material/SensorsOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Loading, EmptyState } from '@/components/common/loading';
import { SectionCard } from '@/components/common/section-card';
import { SoftChip } from '@/components/common/status-chip';
import { formatTime } from '@/lib/format';
import { PersonCell } from '../person-cell';
import { flagLabel } from '../status';

export interface LivePunch {
  id: string;
  employee: { id: string; fullName: string; employeeCode: string | null };
  direction: 'IN' | 'OUT';
  at: string;
  site: string | null;
  flags: string[];
  thumbUrl: string | null;
}

interface LivePunchesProps {
  readonly punches: readonly LivePunch[] | undefined;
  readonly loading: boolean;
  readonly showMap: boolean;
}

export function LivePunches({ punches, loading, showMap }: LivePunchesProps) {
  return (
    <SectionCard
      title="Live punches"
      subtitle="Latest punches for the selected day · refreshes every 30 seconds"
      icon={<SensorsOutlinedIcon />}
      flush
      action={showMap ? <Button component={Link} href="/live-map" size="small" startIcon={<MapOutlinedIcon />}>Open map</Button> : undefined}
    >
      {loading ? (
        <Box sx={{ p: 2.5 }}><Loading minHeight={160} /></Box>
      ) : !punches || punches.length === 0 ? (
        <EmptyState compact icon={<SensorsOutlinedIcon />} title="No punches yet for this day" description="Punches appear here as soon as employees punch in from the app." />
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {punches.map((p, i) => (
            <Stack
              component="li"
              key={p.id}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 1, sm: 2 }}
              sx={{ px: 2.5, py: 1.5, alignItems: { sm: 'center' }, borderTop: i === 0 ? 0 : 1, borderColor: 'divider' }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <PersonCell name={p.employee.fullName} href={`/employees/${p.employee.id}`} caption={p.employee.employeeCode} photoUrl={p.thumbUrl} size={36} />
              </Box>
              <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                {p.flags.map((f) => <SoftChip key={f} label={flagLabel(f)} tone="warning" />)}
                <SoftChip
                  label={p.direction === 'IN' ? 'In' : 'Out'}
                  tone={p.direction === 'IN' ? 'success' : 'info'}
                  icon={p.direction === 'IN' ? <LoginOutlinedIcon /> : <LogoutOutlinedIcon />}
                />
                <Box sx={{ textAlign: 'right', minWidth: 96 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatTime(p.at)}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap component="div">{p.site ?? 'No site'}</Typography>
                </Box>
              </Stack>
            </Stack>
          ))}
        </Box>
      )}
    </SectionCard>
  );
}
