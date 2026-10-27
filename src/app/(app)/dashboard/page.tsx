'use client';

import { useState } from 'react';
import Link from 'next/link';
import RefreshIcon from '@mui/icons-material/Refresh';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { NamedSelect, useBranches, useDepartments, useSites } from '@/components/common/filters';
import { Empty, Loading } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { formatTime, todayIso } from '@/lib/format';
import { api } from '@/lib/http';

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
  pending: { devices: number; leave: number; overtime: number };
}

interface LivePunch {
  id: string;
  employee: { id: string; fullName: string; employeeCode: string | null };
  direction: 'IN' | 'OUT';
  at: string;
  site: string | null;
  flags: string[];
  thumbUrl: string | null;
}

function Stat({ label, value, color, href }: { label: string; value: number; color?: string; href?: string }) {
  const content = (
    <Card sx={{ height: '100%', cursor: href ? 'pointer' : 'default' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h4" color={color} sx={{ fontWeight: 700 }}>{value}</Typography>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardPage() {
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

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={s ? `Attendance for ${s.date}` : undefined}
        actions={
          <Button startIcon={<RefreshIcon />} onClick={() => { summary.refetch(); live.refetch(); }} variant="outlined">
            Refresh
          </Button>
        }
      />
      <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', mb: 3 }}>
        <TextField type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 170 }} />
        <NamedSelect label="Branch" value={branchId} onChange={setBranchId} options={branches.data} />
        <NamedSelect label="Department" value={departmentId} onChange={setDepartmentId} options={departments.data} />
        <NamedSelect label="Site" value={siteId} onChange={setSiteId} options={sites.data} />
      </Stack>
      {summary.isLoading || !s ? (
        <Loading />
      ) : (
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}><Stat label="Employees" value={s.employees} href="/employees" /></Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}><Stat label="Present" value={s.present} color="success.main" href={`/attendance/daily?date=${date}&status=PRESENT`} /></Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}><Stat label="Yet to punch" value={s.yetToPunch} color="text.secondary" href={`/attendance/daily?date=${date}&status=NOT_STARTED`} /></Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}><Stat label="Absent" value={s.absent} color="error.main" href={`/attendance/daily?date=${date}&status=ABSENT`} /></Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}><Stat label="Late" value={s.late} color="warning.main" href={`/attendance/daily?date=${date}&late=true`} /></Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}><Stat label="On leave" value={s.onLeave} /></Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}><Stat label="Half day" value={s.halfDay} /></Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}><Stat label="Missing out-punch" value={s.missingOut} color="warning.main" /></Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}><Stat label="Holiday / week off" value={s.offDay} /></Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}><Stat label="Devices to approve" value={s.pending.devices} color={s.pending.devices ? 'warning.main' : undefined} href="/devices" /></Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}><Stat label="Leave requests" value={s.pending.leave} color={s.pending.leave ? 'warning.main' : undefined} href="/leave" /></Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}><Stat label="Overtime to approve" value={s.pending.overtime} href="/attendance/overtime" /></Grid>
          <Grid size={12}>
            <Card>
              <CardContent>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">Live punches</Typography>
                  <Button component={Link} href="/live-map" size="small">Open map</Button>
                </Stack>
                {live.isLoading ? <Loading minHeight={80} /> : (live.data?.length ?? 0) === 0 ? <Empty text="No punches yet for this day." /> : (
                  <List dense disablePadding>
                    {live.data?.map((p) => (
                      <ListItem key={p.id} disableGutters secondaryAction={<Stack direction="row" spacing={0.5}>{p.flags.map((f) => <Chip key={f} size="small" label={f} color="warning" variant="outlined" />)}</Stack>}>
                        <ListItemAvatar>
                          <Avatar src={p.thumbUrl ?? undefined} variant="rounded">{p.employee.fullName.slice(0, 1)}</Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={<Link href={`/employees/${p.employee.id}`}>{p.employee.fullName}</Link>}
                          secondary={`${p.direction === 'IN' ? 'Punched in' : 'Punched out'} at ${formatTime(p.at)}${p.site ? ` · ${p.site}` : ''}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </>
  );
}
