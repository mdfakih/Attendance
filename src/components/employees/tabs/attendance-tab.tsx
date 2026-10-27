'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { MANUAL_MARK_STATUSES } from '@attendance/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { FormDialog } from '@/components/common/form-dialog';
import { Loading } from '@/components/common/loading';
import { MonthPicker } from '@/components/common/month-picker';
import { useSnackbar } from '@/components/common/snackbar';
import { StatusChip } from '@/components/common/status-chip';
import { formatDateTime, formatMinutes, formatTime, STATUS_COLOR, STATUS_LABEL, thisMonth } from '@/lib/format';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

interface MonthDay {
  date: string;
  status: string;
  statusSource: string;
  dayType: string;
  holidayName: string | null;
  punchCount: number;
  firstPunchAt: string | null;
  lastPunchAt: string | null;
  workedMinutes: number;
  isLate: boolean;
  isMissingOut: boolean;
  flags: string[];
}

interface MonthView {
  month: string;
  days: MonthDay[];
  totals: { workedMinutes: number; present: number; halfDay: number; absent: number; leave: number; late: number };
}

interface DayDetail {
  day: { status: string; computedStatus: string; statusSource: string; workedMinutes: number; lateMinutes: number; isMissingOut: boolean; expectedStartAt: string | null; expectedEndAt: string | null; flags: string[]; periodLocked: boolean } | null;
  punches: Array<{ id: string; serverTime: string; direction: string; site: { name: string } | null; distanceM: number | null; accuracyM: number | null; flags: string[]; selfieUrl: string | null; thumbUrl: string | null; voided: boolean }>;
  manualMarks: Array<{ id: string; action: string; status: string | null; reason: string; previousStatus: string | null; createdAt: string }>;
}

const PALETTE: Record<string, string> = { success: '#2e7d32', warning: '#ed6c02', error: '#d32f2f', info: '#0288d1', secondary: '#7b1fa2', default: '#9e9e9e' };

export function EmployeeAttendanceTab({ employeeId }: { employeeId: string }) {
  const { can, has } = useSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(thisMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const [markOpen, setMarkOpen] = useState(false);
  const [mark, setMark] = useState({ status: 'PRESENT', reason: '', leaveTypeId: '' });
  const view = useQuery({ queryKey: ['employee-month', employeeId, month], queryFn: () => api.get<MonthView>(`/attendance/employees/${employeeId}/month`, { month }) });
  const detail = useQuery({ queryKey: ['employee-day', employeeId, selected], queryFn: () => api.get<DayDetail>(`/attendance/employees/${employeeId}/days/${selected}`), enabled: !!selected });
  const leaveTypes = useQuery({ queryKey: ['leave-types'], queryFn: () => api.get<Array<{ id: string; name: string; isPaid: boolean }>>('/leave/types'), enabled: markOpen });
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ['employee-month', employeeId] }); queryClient.invalidateQueries({ queryKey: ['employee-day', employeeId] }); };
  const markMut = useMutation({
    mutationFn: () => api.post('/attendance/manual-marks', { employeeId, date: selected, status: mark.status, reason: mark.reason, leaveTypeId: mark.leaveTypeId || undefined }),
    onSuccess: () => { refresh(); setMarkOpen(false); notify('Attendance updated'); },
    onError: notifyError,
  });
  const revokeMut = useMutation({
    mutationFn: (reason: string) => api.post('/attendance/manual-marks/revoke', { employeeId, date: selected, reason }),
    onSuccess: () => { refresh(); notify('Manual mark removed'); },
    onError: notifyError,
  });

  const first = dayjs(`${month}-01`);
  const leading = first.day();
  const cells = view.data ? [...Array<null>(leading).fill(null), ...view.data.days] : [];
  const byDate = new Map(view.data?.days.map((d) => [d.date, d]) ?? []);
  const daysInMonth = first.daysInMonth();

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <MonthPicker value={month} onChange={setMonth} />
        {view.data && (
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <Chip size="small" label={`Present ${view.data.totals.present}`} color="success" variant="outlined" />
            <Chip size="small" label={`Half ${view.data.totals.halfDay}`} color="warning" variant="outlined" />
            <Chip size="small" label={`Absent ${view.data.totals.absent}`} color="error" variant="outlined" />
            <Chip size="small" label={`Leave ${view.data.totals.leave}`} variant="outlined" />
            <Chip size="small" label={`Late ${view.data.totals.late}`} variant="outlined" />
            <Chip size="small" label={`Hours ${formatMinutes(view.data.totals.workedMinutes)}`} variant="outlined" />
          </Stack>
        )}
      </Stack>
      {view.isLoading ? <Loading /> : (
        <Card><CardContent>
          <Grid container columns={7} spacing={0.5}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <Grid key={d} size={1}><Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>{d}</Typography></Grid>)}
            {Array.from({ length: leading }).map((_, i) => <Grid key={`b${i}`} size={1} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const date = first.add(i, 'day').format('YYYY-MM-DD');
              const d = byDate.get(date);
              const color = d ? PALETTE[STATUS_COLOR[d.status] ?? 'default'] : '#e0e0e0';
              return (
                <Grid key={date} size={1}>
                  <Box onClick={() => setSelected(date)} sx={{ cursor: 'pointer', borderRadius: 1.5, border: '1px solid', borderColor: selected === date ? 'primary.main' : 'divider', p: 0.75, minHeight: 64, borderLeft: `4px solid ${color}`, '&:hover': { bgcolor: 'action.hover' } }}>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{i + 1}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.2 }}>{d ? STATUS_LABEL[d.status] ?? d.status : ''}</Typography>
                    {d && d.workedMinutes > 0 && <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2 }}>{formatMinutes(d.workedMinutes)}{d.isLate ? ' · late' : ''}</Typography>}
                  </Box>
                </Grid>
              );
            })}
          </Grid>
          {cells.length === 0 && <Typography color="text.secondary">No attendance recorded this month.</Typography>}
        </CardContent></Card>
      )}

      <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="sm">
        <DialogTitle>{selected ? dayjs(selected).format('dddd, DD MMM YYYY') : ''}</DialogTitle>
        <DialogContent>
          {detail.isLoading ? <Loading minHeight={120} /> : detail.data ? (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                <StatusChip status={detail.data.day?.status ?? 'NOT_STARTED'} />
                {detail.data.day?.statusSource === 'MANUAL' && <Chip size="small" label={`Manually set (was ${STATUS_LABEL[detail.data.day.computedStatus] ?? detail.data.day.computedStatus})`} color="info" variant="outlined" />}
                {detail.data.day && <Typography variant="body2">{formatMinutes(detail.data.day.workedMinutes)} worked{detail.data.day.lateMinutes ? ` · ${detail.data.day.lateMinutes} min late` : ''}</Typography>}
                {detail.data.day?.periodLocked && <Chip size="small" label="Month locked" />}
              </Stack>
              {detail.data.punches.length === 0 ? <Typography color="text.secondary">No punches.</Typography> : detail.data.punches.map((p) => (
                <Stack key={p.id} direction="row" spacing={1.5} sx={{ alignItems: 'center', opacity: p.voided ? 0.5 : 1 }}>
                  {p.thumbUrl ? <img src={p.thumbUrl} alt="" width={56} height={56} style={{ borderRadius: 8, objectFit: 'cover' }} /> : <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'action.hover' }} />}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography sx={{ fontWeight: 600 }}>{p.direction === 'IN' ? 'Punch in' : 'Punch out'} · {formatTime(p.serverTime)}</Typography>
                    <Typography variant="body2" color="text.secondary">{p.site?.name ?? 'No site'}{p.distanceM !== null ? ` · ${p.distanceM} m away` : ''}{p.accuracyM ? ` · ±${Math.round(p.accuracyM)} m` : ''}</Typography>
                    {p.flags.length > 0 && <Stack direction="row" spacing={0.5}>{p.flags.map((f) => <Chip key={f} size="small" label={f} color="warning" variant="outlined" />)}</Stack>}
                  </Box>
                  {p.selfieUrl && <Button size="small" href={p.selfieUrl} target="_blank" rel="noreferrer">Selfie</Button>}
                </Stack>
              ))}
              {detail.data.manualMarks.length > 0 && (
                <Box>
                  <Typography variant="overline" color="text.secondary">Manual changes</Typography>
                  {detail.data.manualMarks.map((m) => (
                    <Typography key={m.id} variant="body2">{formatDateTime(m.createdAt)} — {m.action === 'SET' ? `set to ${STATUS_LABEL[m.status ?? ''] ?? m.status}` : 'manual mark removed'}: {m.reason}</Typography>
                  ))}
                </Box>
              )}
              {can('ATTENDANCE_MANUAL', 'create') && !detail.data.day?.periodLocked && (
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" onClick={() => setMarkOpen(true)}>Set status manually</Button>
                  {detail.data.day?.statusSource === 'MANUAL' && can('ATTENDANCE_MANUAL', 'delete') && (
                    <Button color="warning" onClick={() => { const r = window.prompt('Reason for removing the manual mark'); if (r && r.trim().length >= 5) revokeMut.mutate(r.trim()); }}>Remove manual mark</Button>
                  )}
                </Stack>
              )}
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>

      <FormDialog open={markOpen} title="Set attendance manually" busy={markMut.isPending} onClose={() => setMarkOpen(false)} onSubmit={() => markMut.mutate()} maxWidth="xs">
        <TextField select label="Status" value={mark.status} onChange={(e) => setMark({ ...mark, status: e.target.value })}>
          {MANUAL_MARK_STATUSES.filter((s) => s !== 'LEAVE' || !has('LEAVE')).map((s) => <MenuItem key={s} value={s}>{STATUS_LABEL[s] ?? s}</MenuItem>)}
        </TextField>
        {mark.status === 'LEAVE' && (
          <TextField select label="Leave type" value={mark.leaveTypeId} onChange={(e) => setMark({ ...mark, leaveTypeId: e.target.value })}>
            {(leaveTypes.data ?? []).map((t) => <MenuItem key={t.id} value={t.id}>{t.name} ({t.isPaid ? 'paid' : 'unpaid'})</MenuItem>)}
          </TextField>
        )}
        <TextField label="Reason" value={mark.reason} onChange={(e) => setMark({ ...mark, reason: e.target.value })} multiline minRows={2} helperText="Required · recorded in the audit log" />
      </FormDialog>
    </Stack>
  );
}
