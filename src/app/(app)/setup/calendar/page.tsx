'use client';

import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormDialog } from '@/components/common/form-dialog';
import { Loading } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { formatDate, todayIso } from '@/lib/format';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

interface Calendar {
  id: string;
  name: string;
  isDefault: boolean;
  _count: { holidays: number };
}
interface Holiday {
  id: string;
  holidayDate: string;
  name: string;
  kind: string;
  isPaid: boolean;
}
interface Pattern {
  id: string;
  name: string;
  rules: Array<{ dow: number; weeks: 'ALL' | number[] }>;
  active: boolean;
}
interface Override {
  id: string;
  employee: { id: string; fullName: string } | null;
  date: string;
  allowPunch: boolean;
  reason: string;
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const { can } = useSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const year = new Date().getFullYear();
  const [calendarId, setCalendarId] = useState<string>('');
  const [holidayForm, setHolidayForm] = useState<{ holidayDate: string; name: string; kind: string; isPaid: boolean } | null>(null);
  const [calendarForm, setCalendarForm] = useState<{ name: string; isDefault: boolean } | null>(null);
  const [patternForm, setPatternForm] = useState<{ id?: string; name: string; days: Record<number, 'OFF' | 'ALT' | ''> } | null>(null);
  const [overrideForm, setOverrideForm] = useState<{ employeeIds: string[]; dates: string; reason: string } | null>(null);
  const calendars = useQuery({ queryKey: ['calendars'], queryFn: () => api.get<Calendar[]>('/calendars') });
  const activeCalendar = calendarId || calendars.data?.find((c) => c.isDefault)?.id || calendars.data?.[0]?.id || '';
  const holidays = useQuery({ queryKey: ['holidays', activeCalendar, year], queryFn: () => api.get<Holiday[]>(`/calendars/${activeCalendar}/holidays`, { year }), enabled: !!activeCalendar });
  const patterns = useQuery({ queryKey: ['weekly-offs'], queryFn: () => api.get<Pattern[]>('/weekly-offs') });
  const overrides = useQuery({ queryKey: ['overrides'], queryFn: () => api.get<Override[]>('/day-overrides', { from: todayIso(), to: `${year + 1}-12-31` }) });
  const employees = useQuery({ queryKey: ['employees', 'picker'], queryFn: () => api.getPaged<{ id: string; fullName: string }>('/employees', { pageSize: 200 }), enabled: !!overrideForm });
  const inv = (k: string) => queryClient.invalidateQueries({ queryKey: [k] });
  const addHoliday = useMutation({ mutationFn: (f: NonNullable<typeof holidayForm>) => api.post(`/calendars/${activeCalendar}/holidays`, f), onSuccess: () => { inv('holidays'); inv('calendars'); setHolidayForm(null); notify('Holiday added'); }, onError: notifyError });
  const removeHoliday = useMutation({ mutationFn: (id: string) => api.delete(`/holidays/${id}`), onSuccess: () => { inv('holidays'); inv('calendars'); notify('Holiday removed'); }, onError: notifyError });
  const addCalendar = useMutation({ mutationFn: (f: NonNullable<typeof calendarForm>) => api.post('/calendars', f), onSuccess: () => { inv('calendars'); setCalendarForm(null); notify('Calendar added'); }, onError: notifyError });
  const savePattern = useMutation({
    mutationFn: (f: NonNullable<typeof patternForm>) => {
      const rules = Object.entries(f.days).filter(([, v]) => v).map(([dow, v]) => ({ dow: Number(dow), weeks: v === 'OFF' ? ('ALL' as const) : [2, 4] }));
      return f.id ? api.put(`/weekly-offs/${f.id}`, { name: f.name, rules }) : api.post('/weekly-offs', { name: f.name, rules });
    },
    onSuccess: () => { inv('weekly-offs'); setPatternForm(null); notify('Weekly-off pattern saved'); },
    onError: notifyError,
  });
  const grant = useMutation({
    mutationFn: (f: NonNullable<typeof overrideForm>) => api.post('/day-overrides', { employeeIds: f.employeeIds, dates: f.dates.split(/[\s,]+/).filter(Boolean), allowPunch: true, reason: f.reason }),
    onSuccess: () => { inv('overrides'); setOverrideForm(null); notify('Override granted'); },
    onError: notifyError,
  });
  const revoke = useMutation({ mutationFn: (id: string) => api.post(`/day-overrides/${id}/revoke`, { reason: 'Revoked from calendar page' }), onSuccess: () => { inv('overrides'); notify('Override revoked'); }, onError: notifyError });
  const editable = can('CALENDAR', 'edit');

  const describe = (p: Pattern) => p.rules.map((r) => `${DOW[r.dow]}${r.weeks === 'ALL' ? '' : ` (${r.weeks.map((w) => `${w}${w === 2 ? 'nd' : w === 4 ? 'th' : 'st'}`).join('/')})`}`).join(', ') || 'No weekly off';

  return (
    <>
      <PageHeader title="Holidays & weekly offs" subtitle="Employees cannot punch on these days unless you grant them an override." />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card><CardContent>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>Holidays {year}</Typography>
              <TextField select size="small" value={activeCalendar} onChange={(e) => setCalendarId(e.target.value)} sx={{ minWidth: 160 }}>{calendars.data?.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}{c.isDefault ? ' (default)' : ''}</MenuItem>)}</TextField>
              {can('CALENDAR', 'create') && <Button size="small" onClick={() => setCalendarForm({ name: '', isDefault: false })}>New calendar</Button>}
              {can('CALENDAR', 'create') && <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setHolidayForm({ holidayDate: todayIso(), name: '', kind: 'FESTIVAL', isPaid: true })} disabled={!activeCalendar}>Add</Button>}
            </Stack>
            {holidays.isLoading ? <Loading minHeight={80} /> : (holidays.data?.length ?? 0) === 0 ? <Typography color="text.secondary" variant="body2">No holidays this year.</Typography> : (
              <Table size="small"><TableBody>
                {holidays.data?.map((h) => (
                  <TableRow key={h.id}><TableCell>{formatDate(h.holidayDate)}</TableCell><TableCell>{h.name}</TableCell><TableCell><Chip size="small" label={h.isPaid ? 'paid' : 'unpaid'} variant="outlined" /></TableCell><TableCell align="right">{can('CALENDAR', 'delete') && <IconButton size="small" onClick={() => removeHoliday.mutate(h.id)} aria-label="Remove"><DeleteIcon fontSize="small" /></IconButton>}</TableCell></TableRow>
                ))}
              </TableBody></Table>
            )}
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ mb: 2 }}><CardContent>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">Weekly-off patterns</Typography>
              {can('CALENDAR', 'create') && <Button size="small" startIcon={<AddIcon />} onClick={() => setPatternForm({ name: '', days: { 0: 'OFF' } })}>Add</Button>}
            </Stack>
            {patterns.isLoading ? <Loading minHeight={60} /> : (
              <Table size="small"><TableBody>
                {patterns.data?.map((p) => (
                  <TableRow key={p.id}><TableCell>{p.name}</TableCell><TableCell>{describe(p)}</TableCell><TableCell align="right">{editable && <Button size="small" onClick={() => setPatternForm({ id: p.id, name: p.name, days: Object.fromEntries(p.rules.map((r) => [r.dow, r.weeks === 'ALL' ? 'OFF' : 'ALT'])) })}>Edit</Button>}</TableCell></TableRow>
                ))}
              </TableBody></Table>
            )}
          </CardContent></Card>
          <Card><CardContent>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">Punch overrides</Typography>
              {editable && <Button size="small" startIcon={<AddIcon />} onClick={() => setOverrideForm({ employeeIds: [], dates: todayIso(), reason: '' })}>Allow punching</Button>}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Lets specific employees punch on a holiday or weekly off (e.g. maintenance staff).</Typography>
            {(overrides.data?.length ?? 0) === 0 ? <Typography color="text.secondary" variant="body2">None upcoming.</Typography> : (
              <Table size="small"><TableBody>
                {overrides.data?.map((o) => (
                  <TableRow key={o.id}><TableCell>{formatDate(o.date)}</TableCell><TableCell>{o.employee?.fullName}</TableCell><TableCell>{o.reason}</TableCell><TableCell align="right">{editable && <Button size="small" color="warning" onClick={() => revoke.mutate(o.id)}>Revoke</Button>}</TableCell></TableRow>
                ))}
              </TableBody></Table>
            )}
          </CardContent></Card>
        </Grid>
      </Grid>

      <FormDialog open={!!holidayForm} title="Add holiday" busy={addHoliday.isPending} onClose={() => setHolidayForm(null)} onSubmit={() => holidayForm && addHoliday.mutate(holidayForm)} maxWidth="xs">
        {holidayForm && (<>
          <TextField type="date" label="Date" value={holidayForm.holidayDate} onChange={(e) => setHolidayForm({ ...holidayForm, holidayDate: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Name" value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} autoFocus />
          <TextField select label="Type" value={holidayForm.kind} onChange={(e) => setHolidayForm({ ...holidayForm, kind: e.target.value })}><MenuItem value="NATIONAL">National</MenuItem><MenuItem value="FESTIVAL">Festival</MenuItem><MenuItem value="COMPANY">Company</MenuItem><MenuItem value="OPTIONAL">Optional</MenuItem></TextField>
          <FormControlLabel control={<Checkbox checked={holidayForm.isPaid} onChange={(e) => setHolidayForm({ ...holidayForm, isPaid: e.target.checked })} />} label="Paid holiday" />
        </>)}
      </FormDialog>
      <FormDialog open={!!calendarForm} title="New holiday calendar" busy={addCalendar.isPending} onClose={() => setCalendarForm(null)} onSubmit={() => calendarForm && addCalendar.mutate(calendarForm)} maxWidth="xs">
        {calendarForm && (<>
          <TextField label="Name" value={calendarForm.name} onChange={(e) => setCalendarForm({ ...calendarForm, name: e.target.value })} autoFocus helperText="e.g. Maharashtra, Karnataka — assign to branches" />
          <FormControlLabel control={<Checkbox checked={calendarForm.isDefault} onChange={(e) => setCalendarForm({ ...calendarForm, isDefault: e.target.checked })} />} label="Make this the company default" />
        </>)}
      </FormDialog>
      <FormDialog open={!!patternForm} title={patternForm?.id ? 'Edit weekly-off pattern' : 'New weekly-off pattern'} busy={savePattern.isPending} onClose={() => setPatternForm(null)} onSubmit={() => patternForm && savePattern.mutate(patternForm)} maxWidth="xs">
        {patternForm && (<>
          <TextField label="Name" value={patternForm.name} onChange={(e) => setPatternForm({ ...patternForm, name: e.target.value })} autoFocus />
          {DOW.map((d, i) => (
            <TextField key={d} select label={d} value={patternForm.days[i] ?? ''} onChange={(e) => setPatternForm({ ...patternForm, days: { ...patternForm.days, [i]: e.target.value as 'OFF' | 'ALT' | '' } })}>
              <MenuItem value="">Working day</MenuItem><MenuItem value="OFF">Weekly off</MenuItem><MenuItem value="ALT">Off on 2nd & 4th week</MenuItem>
            </TextField>
          ))}
        </>)}
      </FormDialog>
      <FormDialog open={!!overrideForm} title="Allow punching on an off day" submitLabel="Grant" busy={grant.isPending} onClose={() => setOverrideForm(null)} onSubmit={() => overrideForm && grant.mutate(overrideForm)} maxWidth="xs">
        {overrideForm && (<>
          <TextField select label="Employees" value={overrideForm.employeeIds} onChange={(e) => setOverrideForm({ ...overrideForm, employeeIds: (typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value) as string[] })} slotProps={{ select: { multiple: true } }}>
            {employees.data?.items.map((e) => <MenuItem key={e.id} value={e.id}>{e.fullName}</MenuItem>)}
          </TextField>
          <TextField label="Dates" value={overrideForm.dates} onChange={(e) => setOverrideForm({ ...overrideForm, dates: e.target.value })} helperText="YYYY-MM-DD, comma separated" />
          <TextField label="Reason" value={overrideForm.reason} onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })} multiline minRows={2} />
        </>)}
      </FormDialog>
    </>
  );
}
