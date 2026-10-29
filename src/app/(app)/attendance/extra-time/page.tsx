'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';
import type { RegularizationDecisionInput } from '@attendance/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PersonCell } from '@/components/admin/person-cell';
import { REQUEST_FILTERS, REQUEST_STATUS } from '@/components/admin/status';
import { StatusTabs } from '@/components/admin/status-tabs';
import { DataTable } from '@/components/common/data-table';
import { FeatureGate } from '@/components/common/feature-gate';
import { FormDialog } from '@/components/common/form-dialog';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { SoftChip } from '@/components/common/status-chip';
import { formatDate, formatMinutes, formatTime } from '@/lib/format';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

interface RegDay {
  date: string;
  status: string;
  dayType: string;
  expectedStartAt: string | null;
  expectedEndAt: string | null;
  firstPunchAt: string | null;
  lastPunchAt: string | null;
  workedMinutes: number;
  outsideEarlyMinutes: number;
  outsideLateMinutes: number;
  outsideMinutes: number;
  regState: string;
  regApprovedMinutes: number;
}

interface RegRow {
  id: string;
  date: string;
  status: string;
  reason: string;
  outsideMinutesAtRequest: number;
  approvedMinutes: number;
  decisionNote: string | null;
  createdAt: string;
  decidedAt: string | null;
  employee: { id: string; fullName: string; employeeCode: string | null };
  day: RegDay | null;
}

interface Pending {
  row: RegRow;
  decision: RegularizationDecisionInput['decision'];
}

const OFF_DAY: Record<string, string> = { WEEKLY_OFF: 'Weekly off', HOLIDAY: 'Holiday' };

/** What can still be approved: the day's current outside time, or what was asked for if the day is gone. */
function outsideOf(r: RegRow): number {
  return r.day?.outsideMinutes ?? r.outsideMinutesAtRequest;
}

function workingHours(d: RegDay | null): string {
  if (!d) return '—';
  if (OFF_DAY[d.dayType]) return OFF_DAY[d.dayType];
  return d.expectedStartAt ? `${formatTime(d.expectedStartAt)}–${formatTime(d.expectedEndAt)}` : '—';
}

/** "20m before start · 45m after end"; on an off day all worked time is outside, so there is no split. */
function outsideSplit(r: RegRow): string {
  const d = r.day;
  const parts = d ? [d.outsideEarlyMinutes ? `${formatMinutes(d.outsideEarlyMinutes)} before start` : '', d.outsideLateMinutes ? `${formatMinutes(d.outsideLateMinutes)} after end` : ''].filter(Boolean) : [];
  return parts.length ? parts.join(' · ') : formatMinutes(outsideOf(r));
}

function ExtraTimeRequests() {
  const { can } = useSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pending, setPending] = useState<Pending | null>(null);
  const [minutes, setMinutes] = useState('');
  const [note, setNote] = useState('');
  const params = { status: status || undefined, page, pageSize };
  const list = useQuery({ queryKey: ['regularizations', params], queryFn: () => api.getPaged<RegRow>('/attendance/regularizations', params) });
  const decide = useMutation({
    mutationFn: ({ id, body }: { id: string; body: RegularizationDecisionInput }) => api.post(`/attendance/regularizations/${id}/decision`, body),
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['regularizations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      setPending(null);
      notify(v.body.decision === 'APPROVED' ? 'Extra time counted' : 'Request rejected');
    },
    onError: notifyError,
  });
  const openDecision = (row: RegRow, decision: Pending['decision']) => { setPending({ row, decision }); setMinutes(String(outsideOf(row))); setNote(''); };
  const max = pending ? outsideOf(pending.row) : 0;
  const approved = Number(minutes);
  const minutesError = pending?.decision === 'APPROVED' && !(Number.isInteger(approved) && approved >= 1 && approved <= max) ? `Enter 1 to ${max} minutes` : '';
  const submit = () => {
    if (!pending || minutesError) return;
    const body: RegularizationDecisionInput = { decision: pending.decision, approvedMinutes: pending.decision === 'APPROVED' ? approved : undefined, note: note.trim() || undefined };
    decide.mutate({ id: pending.row.id, body });
  };

  const columns: GridColDef<RegRow>[] = [
    { field: 'name', headerName: 'Employee', flex: 1, minWidth: 200, valueGetter: (_, r) => r.employee.fullName, renderCell: (p) => <PersonCell name={p.row.employee.fullName} href={`/employees/${p.row.employee.id}`} caption={p.row.employee.employeeCode} /> },
    { field: 'date', headerName: 'Date', width: 120, valueGetter: (_, r) => formatDate(r.date) },
    { field: 'hours', headerName: 'Working hours', width: 130, valueGetter: (_, r) => workingHours(r.day) },
    { field: 'punches', headerName: 'Punches', width: 120, valueGetter: (_, r) => (r.day ? `${formatTime(r.day.firstPunchAt)}–${formatTime(r.day.lastPunchAt)}` : '—') },
    { field: 'outside', headerName: 'Outside hours', width: 220, valueGetter: (_, r) => outsideSplit(r) },
    { field: 'reason', headerName: 'Reason', flex: 1, minWidth: 200 },
    { field: 'status', headerName: 'Status', width: 160, renderCell: (p) => { const s = REQUEST_STATUS[p.row.status] ?? { label: p.row.status, tone: 'default' as const }; return <SoftChip label={p.row.status === 'APPROVED' ? `Approved ${formatMinutes(p.row.approvedMinutes)}` : s.label} tone={s.tone} dot />; } },
    {
      field: 'actions', headerName: '', width: 180, sortable: false,
      renderCell: (p) => (can('ATTENDANCE', 'edit') && p.row.status === 'PENDING' ? (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="contained" disabled={outsideOf(p.row) === 0} onClick={() => openDecision(p.row, 'APPROVED')}>Approve</Button>
          <Button size="small" color="error" onClick={() => openDecision(p.row, 'REJECTED')}>Reject</Button>
        </Stack>
      ) : null),
    },
  ];

  return (
    <>
      <PageHeader title="Extra time requests" subtitle="Time punched outside working hours counts only once approved. It first completes the day; the rest becomes overtime." />
      <StatusTabs value={status} options={REQUEST_FILTERS} onChange={(v) => { setStatus(v); setPage(1); }} />
      <DataTable
        rows={list.data?.items ?? []}
        columns={columns}
        loading={list.isLoading}
        total={list.data?.meta.total}
        page={page}
        pageSize={pageSize}
        onPageChange={(p, s) => { setPage(p); setPageSize(s); }}
        emptyText={status === 'PENDING' ? 'No extra time requests waiting. You’re all caught up.' : 'No requests here.'}
      />
      <FormDialog
        open={!!pending}
        title={pending?.decision === 'APPROVED' ? 'Count extra time' : 'Reject request'}
        subtitle={pending ? `${pending.row.employee.fullName} · ${formatDate(pending.row.date)}` : undefined}
        submitLabel={pending?.decision === 'APPROVED' ? 'Approve' : 'Reject'}
        submitDisabled={!!minutesError}
        busy={decide.isPending}
        onClose={() => setPending(null)}
        onSubmit={submit}
        maxWidth="xs"
      >
        {pending && (
          <>
            <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'action.hover' }}>
              <Typography variant="body2"><strong>Outside working hours:</strong> {outsideSplit(pending.row)}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}><strong>Reason:</strong> {pending.row.reason}</Typography>
            </Box>
            {pending.decision === 'APPROVED' && (
              <TextField label="Minutes to count" type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} error={!!minutesError} helperText={minutesError || `${formatMinutes(approved)} of ${formatMinutes(max)}`} slotProps={{ htmlInput: { min: 1, max } }} autoFocus />
            )}
            <TextField label="Note to employee (optional)" value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 300 } }} />
          </>
        )}
      </FormDialog>
    </>
  );
}

export default function ExtraTimePage() {
  return (
    <FeatureGate feature="EXTRA_TIME">
      <ExtraTimeRequests />
    </FeatureGate>
  );
}
