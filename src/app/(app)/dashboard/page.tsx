'use client';

import { useState, type ReactNode } from 'react';
import AlarmOutlinedIcon from '@mui/icons-material/AlarmOutlined';
import BeachAccessOutlinedIcon from '@mui/icons-material/BeachAccessOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import MoreTimeOutlinedIcon from '@mui/icons-material/MoreTimeOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import PhonelinkLockOutlinedIcon from '@mui/icons-material/PhonelinkLockOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import TimelapseOutlinedIcon from '@mui/icons-material/TimelapseOutlined';
import WeekendOutlinedIcon from '@mui/icons-material/WeekendOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { LivePunches, type LivePunch } from '@/components/admin/dashboard/live-punches';
import { FilterBar } from '@/components/admin/filter-bar';
import { NamedSelect, useBranches, useDepartments, useSites } from '@/components/common/filters';
import { ErrorAlert, StatGridSkeleton } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { StatCard } from '@/components/common/stat-card';
import { formatDate, todayIso } from '@/lib/format';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';
import type { Tone } from '@/lib/tone';

interface Summary {
  date: string;
  employees: number;
  present: number;
  halfDay: number;
  absent: number;
  onLeave: number;
  offDay: number;
  late: number;
  missingOut: number;
  yetToPunch: number;
  pending: { devices: number; leave: number; regularizations: number };
}

interface Tile {
  readonly label: string;
  readonly value: number;
  readonly icon: ReactNode;
  readonly tone: Tone;
  readonly href?: string;
  readonly caption?: string;
  readonly highlight?: boolean;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function share(part: number, whole: number): string | undefined {
  return whole > 0 ? `${Math.round((part / whole) * 100)}% of team` : undefined;
}

function TileGrid({ tiles }: { tiles: readonly Tile[] }) {
  return (
    <Grid container spacing={2}>
      {tiles.map((t) => (
        <Grid key={t.label} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard label={t.label} value={t.value} icon={t.icon} tone={t.tone} href={t.href} caption={t.caption} highlight={t.highlight} />
        </Grid>
      ))}
    </Grid>
  );
}

export default function DashboardPage() {
  const { session, has, can } = useSession();
  const [date, setDate] = useState(todayIso());
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [siteId, setSiteId] = useState('');
  const params = { date, branchId: branchId || undefined, departmentId: departmentId || undefined, siteId: siteId || undefined };
  const summary = useQuery({ queryKey: ['dashboard', 'summary', params], queryFn: () => api.get<Summary>('/dashboard/summary', params), refetchInterval: 60_000 });
  const live = useQuery({ queryKey: ['dashboard', 'live', params], queryFn: () => api.get<LivePunch[]>('/dashboard/live', params), refetchInterval: 30_000 });
  const branches = useBranches();
  const departments = useDepartments();
  const sites = useSites();
  const s = summary.data;
  const isToday = date === todayIso();
  const daily = (query: string) => `/attendance/daily?date=${date}&${query}`;
  const showDevices = can('DEVICES');
  const showLeave = has('LEAVE') && can('LEAVE');
  const showExtra = has('EXTRA_TIME');
  const attentionCount = Number(showDevices) + Number(showLeave) + Number(showExtra);

  const today: Tile[] = s
    ? [
        { label: 'Employees', value: s.employees, icon: <PeopleAltOutlinedIcon />, tone: 'primary', href: '/employees' },
        { label: 'Present', value: s.present, icon: <HowToRegOutlinedIcon />, tone: 'success', href: daily('status=PRESENT'), caption: share(s.present, s.employees) },
        { label: 'Yet to punch', value: s.yetToPunch, icon: <HourglassEmptyOutlinedIcon />, tone: 'info', href: daily('status=NOT_STARTED') },
        { label: 'Absent', value: s.absent, icon: <PersonOffOutlinedIcon />, tone: 'error', href: daily('status=ABSENT') },
        { label: 'Late', value: s.late, icon: <AlarmOutlinedIcon />, tone: 'warning', href: daily('late=true') },
        { label: 'On leave', value: s.onLeave, icon: <BeachAccessOutlinedIcon />, tone: 'secondary', href: daily('status=LEAVE') },
        { label: 'Half day', value: s.halfDay, icon: <TimelapseOutlinedIcon />, tone: 'warning', href: daily('status=HALF_DAY') },
        { label: 'Missing out-punch', value: s.missingOut, icon: <LogoutOutlinedIcon />, tone: 'warning', href: daily('status=MISSING_OUT') },
        { label: 'Holiday / week off', value: s.offDay, icon: <WeekendOutlinedIcon />, tone: 'info' },
      ]
    : [];
  const attention: Tile[] = s
    ? [
        ...(showDevices ? [{ label: 'Devices to approve', value: s.pending.devices, icon: <PhonelinkLockOutlinedIcon />, tone: 'warning' as const, href: '/devices', highlight: s.pending.devices > 0, caption: s.pending.devices ? 'Waiting for you' : 'All clear' }] : []),
        ...(showLeave ? [{ label: 'Leave requests', value: s.pending.leave, icon: <EventBusyOutlinedIcon />, tone: 'warning' as const, href: '/leave', highlight: s.pending.leave > 0, caption: s.pending.leave ? 'Waiting for you' : 'All clear' }] : []),
        ...(showExtra ? [{ label: 'Extra time requests', value: s.pending.regularizations, icon: <MoreTimeOutlinedIcon />, tone: 'warning' as const, href: '/attendance/extra-time', highlight: s.pending.regularizations > 0, caption: s.pending.regularizations ? 'Waiting for you' : 'All clear' }] : []),
      ]
    : [];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${session.user.fullName.split(' ')[0]}`}
        subtitle={`Here’s how ${session.tenant.displayName} is doing ${isToday ? 'today' : `on ${formatDate(date)}`}.`}
        actions={
          <Button startIcon={<RefreshOutlinedIcon />} variant="outlined" loading={summary.isFetching || live.isFetching} loadingPosition="start" onClick={() => { void summary.refetch(); void live.refetch(); }}>
            Refresh
          </Button>
        }
      />
      <FilterBar>
        <TextField type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value || todayIso())} slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: todayIso() } }} />
        <NamedSelect label="Branch" value={branchId} onChange={setBranchId} options={branches.data} allLabel="All branches" />
        <NamedSelect label="Department" value={departmentId} onChange={setDepartmentId} options={departments.data} allLabel="All departments" />
        <NamedSelect label="Site" value={siteId} onChange={setSiteId} options={sites.data} allLabel="All sites" />
      </FilterBar>

      {summary.error ? (
        <ErrorAlert error={summary.error} onRetry={() => summary.refetch()} />
      ) : (
        <Stack spacing={3.5}>
          {attentionCount > 0 && (
            <Box>
              <Typography variant="overline" color="text.secondary" component="h2" sx={{ display: 'block', mb: 1 }}>Needs your attention</Typography>
              {s ? <TileGrid tiles={attention} /> : <StatGridSkeleton count={attentionCount} />}
            </Box>
          )}
          <Box>
            <Typography variant="overline" color="text.secondary" component="h2" sx={{ display: 'block', mb: 1 }}>{isToday ? 'Today' : formatDate(date)}</Typography>
            {s ? <TileGrid tiles={today} /> : <StatGridSkeleton count={8} />}
          </Box>
          <LivePunches punches={live.data} loading={live.isLoading} showMap={has('LIVE_MAP')} />
        </Stack>
      )}
    </>
  );
}
