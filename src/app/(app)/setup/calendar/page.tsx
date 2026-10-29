'use client';

import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import CelebrationOutlinedIcon from '@mui/icons-material/CelebrationOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EventRepeatOutlinedIcon from '@mui/icons-material/EventRepeatOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
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
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormDialog } from '@/components/common/form-dialog';
import { EmptyState, Loading } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { SectionCard } from '@/components/common/section-card';
import { useSnackbar } from '@/components/common/snackbar';
import { SoftChip } from '@/components/common/status-chip';
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
const KIND_LABEL: Record<string, string> = { NATIONAL: 'National', FESTIVAL: 'Festival', COMPANY: 'Company', OPTIONAL: 'Optional' };

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
      <PageHeader title="Holidays & weekly offs" subtitle="Employees cannot punch on these days unless you allow it for them." />
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard
            title={`Holidays ${year}`}
            icon={<CelebrationOutlinedIcon />}
            flush
            action={can('CALENDAR', 'create') ? <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setHolidayForm({ holidayDate: todayIso(), name: '', kind: 'FESTIVAL', isPaid: true })} disabled={!activeCalendar}>Add holiday</Button> : undefined}
          >
            <Stack direction="row" spacing={1} sx={{ px: 2.5, py: 1.5, alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
              <TextField select label="Calendar" value={activeCalendar} onChange={(e) => setCalendarId(e.target.value)} disabled={!calendars.data?.length}>
                {calendars.data?.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}{c.isDefault ? ' (default)' : ''}</MenuItem>)}
              </TextField>
              {can('CALENDAR', 'create') && <Button size="small" sx={{ flexShrink: 0 }} onClick={() => setCalendarForm({ name: '', isDefault: false })}>New calendar</Button>}
            </Stack>
            {holidays.isLoading ? <Box sx={{ p: 2.5 }}><Loading minHeight={120} /></Box> : (holidays.data?.length ?? 0) === 0 ? <EmptyState compact icon={<CelebrationOutlinedIcon />} title="No holidays this year" description="Add national, festival and company holidays." /> : (
              <Table size="small">
                <TableBody>
                  {holidays.data?.map((h) => (
                    <TableRow key={h.id} hover>
                      <TableCell sx={{ pl: 2.5, whiteSpace: 'nowrap', fontWeight: 600 }}>{formatDate(h.holidayDate)}</TableCell>
                      <TableCell>{h.name}<Typography variant="caption" color="text.secondary" component="div">{KIND_LABEL[h.kind] ?? h.kind}</Typography></TableCell>
                      <TableCell><SoftChip label={h.isPaid ? 'Paid' : 'Unpaid'} tone={h.isPaid ? 'success' : 'default'} /></TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>
                        {can('CALENDAR', 'delete') && (
                          <Tooltip title="Remove holiday">
                            <span><IconButton size="small" onClick={() => removeHoliday.mutate(h.id)} disabled={removeHoliday.isPending} aria-label={`Remove ${h.name}`}><DeleteOutlineOutlinedIcon fontSize="small" /></IconButton></span>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Stack spacing={2.5}>
            <SectionCard title="Weekly-off patterns" icon={<EventRepeatOutlinedIcon />} flush action={can('CALENDAR', 'create') ? <Button size="small" startIcon={<AddIcon />} onClick={() => setPatternForm({ name: '', days: { 0: 'OFF' } })}>Add pattern</Button> : undefined}>
              {patterns.isLoading ? <Box sx={{ p: 2.5 }}><Loading minHeight={80} /></Box> : (patterns.data?.length ?? 0) === 0 ? <EmptyState compact title="No weekly-off patterns" /> : (
                <Table size="small">
                  <TableBody>
                    {patterns.data?.map((p) => (
                      <TableRow key={p.id} hover>
                        <TableCell sx={{ pl: 2.5, fontWeight: 600 }}>{p.name}</TableCell>
                        <TableCell>{describe(p)}</TableCell>
                        <TableCell align="right" sx={{ pr: 2.5 }}>{editable && <Button size="small" onClick={() => setPatternForm({ id: p.id, name: p.name, days: Object.fromEntries(p.rules.map((r) => [r.dow, r.weeks === 'ALL' ? 'OFF' : 'ALT'])) })}>Edit</Button>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </SectionCard>
            <SectionCard
              title="Punching on off days"
              subtitle="Let specific employees punch on a holiday or weekly off (e.g. maintenance staff)."
              icon={<HowToRegOutlinedIcon />}
              flush
              action={editable ? <Button size="small" startIcon={<AddIcon />} onClick={() => setOverrideForm({ employeeIds: [], dates: todayIso(), reason: '' })}>Allow punching</Button> : undefined}
            >
              {overrides.isLoading ? <Box sx={{ p: 2.5 }}><Loading minHeight={80} /></Box> : (overrides.data?.length ?? 0) === 0 ? <EmptyState compact title="None upcoming" /> : (
                <Table size="small">
                  <TableBody>
                    {overrides.data?.map((o) => (
                      <TableRow key={o.id} hover>
                        <TableCell sx={{ pl: 2.5, whiteSpace: 'nowrap', fontWeight: 600 }}>{formatDate(o.date)}</TableCell>
                        <TableCell>{o.employee?.fullName}</TableCell>
                        <TableCell>{o.reason}</TableCell>
                        <TableCell align="right" sx={{ pr: 2.5 }}>{editable && <Button size="small" color="warning" disabled={revoke.isPending} onClick={() => revoke.mutate(o.id)}>Revoke</Button>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>

      <FormDialog open={!!holidayForm} title="Add holiday" busy={addHoliday.isPending} onClose={() => setHolidayForm(null)} onSubmit={() => holidayForm && addHoliday.mutate(holidayForm)} maxWidth="xs">
        {holidayForm && (<>
          <TextField type="date" label="Date" value={holidayForm.holidayDate} onChange={(e) => setHolidayForm({ ...holidayForm, holidayDate: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Name" value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} autoFocus placeholder="e.g. Diwali" />
          <TextField select label="Type" value={holidayForm.kind} onChange={(e) => setHolidayForm({ ...holidayForm, kind: e.target.value })}>{Object.entries(KIND_LABEL).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}</TextField>
          <FormControlLabel control={<Checkbox checked={holidayForm.isPaid} onChange={(e) => setHolidayForm({ ...holidayForm, isPaid: e.target.checked })} />} label="Paid holiday" />
        </>)}
      </FormDialog>
      <FormDialog open={!!calendarForm} title="New holiday calendar" subtitle="Use separate calendars for branches in different states." busy={addCalendar.isPending} onClose={() => setCalendarForm(null)} onSubmit={() => calendarForm && addCalendar.mutate(calendarForm)} maxWidth="xs">
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
      <FormDialog open={!!overrideForm} title="Allow punching on an off day" submitLabel="Allow" busy={grant.isPending} onClose={() => setOverrideForm(null)} onSubmit={() => overrideForm && grant.mutate(overrideForm)} maxWidth="xs">
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
