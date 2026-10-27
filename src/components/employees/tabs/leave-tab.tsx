'use client';

import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormDialog } from '@/components/common/form-dialog';
import { Loading } from '@/components/common/loading';
import { useSnackbar } from '@/components/common/snackbar';
import { formatDate, todayIso } from '@/lib/format';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

interface Balance {
  leaveTypeId: string;
  code: string;
  name: string;
  isPaid: boolean;
  allowHalfDay: boolean;
  balance: number;
  pending: number;
  used: number;
  unlimited: boolean;
}

interface LeaveRequest {
  id: string;
  leaveType: { name: string } | null;
  fromDate: string;
  toDate: string;
  days: number;
  status: string;
  reason: string;
}

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default'> = { APPROVED: 'success', PENDING: 'warning', REJECTED: 'error', CANCELLED: 'default' };

export function EmployeeLeaveTab({ employeeId }: { employeeId: string }) {
  const { can } = useSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const year = new Date().getFullYear();
  const [applyOpen, setApplyOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [apply, setApply] = useState({ leaveTypeId: '', fromDate: todayIso(), toDate: todayIso(), fromPart: 'FULL', toPart: 'FULL', reason: '' });
  const [adjust, setAdjust] = useState({ leaveTypeId: '', days: '', reason: '' });
  const balances = useQuery({ queryKey: ['leave-balances', employeeId, year], queryFn: () => api.get<Balance[]>(`/leave/employees/${employeeId}/balances`, { year }) });
  const requests = useQuery({ queryKey: ['leave-requests', { employeeId }], queryFn: () => api.getPaged<LeaveRequest>('/leave/requests', { employeeId, pageSize: 50 }) });
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ['leave-balances', employeeId] }); queryClient.invalidateQueries({ queryKey: ['leave-requests'] }); queryClient.invalidateQueries({ queryKey: ['employee-month', employeeId] }); };
  const applyMut = useMutation({ mutationFn: () => api.post('/leave/requests', { employeeId, ...apply }), onSuccess: () => { refresh(); setApplyOpen(false); notify('Leave recorded'); }, onError: notifyError });
  const adjustMut = useMutation({ mutationFn: () => api.post('/leave/balances/adjust', { employeeId, leaveTypeId: adjust.leaveTypeId, days: Number(adjust.days), reason: adjust.reason }), onSuccess: () => { refresh(); setAdjustOpen(false); notify('Balance adjusted'); }, onError: notifyError });
  const cancel = useMutation({ mutationFn: (id: string) => api.post(`/leave/requests/${id}/cancel`), onSuccess: () => { refresh(); notify('Leave cancelled'); }, onError: notifyError });
  const types = balances.data ?? [];

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 5 }}>
        <Card><CardContent>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">Balances {year}</Typography>
            {can('LEAVE', 'edit') && <Button size="small" onClick={() => setAdjustOpen(true)}>Adjust</Button>}
          </Stack>
          {balances.isLoading ? <Loading minHeight={80} /> : (
            <Table size="small">
              <TableHead><TableRow><TableCell>Type</TableCell><TableCell align="right">Available</TableCell><TableCell align="right">Used</TableCell></TableRow></TableHead>
              <TableBody>
                {types.map((b) => (
                  <TableRow key={b.leaveTypeId}><TableCell>{b.name} <Typography component="span" variant="caption" color="text.secondary">{b.isPaid ? 'paid' : 'unpaid'}</Typography></TableCell><TableCell align="right">{b.unlimited ? '∞' : b.balance - b.pending}{b.pending ? <Typography component="span" variant="caption" color="text.secondary"> ({b.pending} pending)</Typography> : null}</TableCell><TableCell align="right">{b.used}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent></Card>
      </Grid>
      <Grid size={{ xs: 12, md: 7 }}>
        <Card><CardContent>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">Leave taken</Typography>
            {can('LEAVE', 'create') && <Button size="small" startIcon={<AddIcon />} onClick={() => setApplyOpen(true)}>Record leave</Button>}
          </Stack>
          {requests.isLoading ? <Loading minHeight={80} /> : (requests.data?.items.length ?? 0) === 0 ? <Typography color="text.secondary" variant="body2">No leave requests.</Typography> : (
            <Table size="small">
              <TableHead><TableRow><TableCell>Dates</TableCell><TableCell>Type</TableCell><TableCell align="right">Days</TableCell><TableCell>Status</TableCell><TableCell /></TableRow></TableHead>
              <TableBody>
                {requests.data?.items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.fromDate)}{r.toDate !== r.fromDate ? ` → ${formatDate(r.toDate)}` : ''}</TableCell>
                    <TableCell>{r.leaveType?.name}</TableCell>
                    <TableCell align="right">{r.days}</TableCell>
                    <TableCell><Chip size="small" label={r.status} color={STATUS_COLOR[r.status]} variant="outlined" /></TableCell>
                    <TableCell align="right">{(r.status === 'APPROVED' || r.status === 'PENDING') && can('LEAVE', 'edit') && <Button size="small" color="warning" onClick={() => cancel.mutate(r.id)}>Cancel</Button>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent></Card>
      </Grid>

      <FormDialog open={applyOpen} title="Record leave on behalf of employee" submitLabel="Approve & record" busy={applyMut.isPending} onClose={() => setApplyOpen(false)} onSubmit={() => applyMut.mutate()} maxWidth="xs">
        <TextField select label="Leave type" value={apply.leaveTypeId} onChange={(e) => setApply({ ...apply, leaveTypeId: e.target.value })}>
          {types.map((t) => <MenuItem key={t.leaveTypeId} value={t.leaveTypeId}>{t.name}</MenuItem>)}
        </TextField>
        <Stack direction="row" spacing={1}>
          <TextField type="date" label="From" value={apply.fromDate} onChange={(e) => setApply({ ...apply, fromDate: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField select label="Part" value={apply.fromPart} onChange={(e) => setApply({ ...apply, fromPart: e.target.value })} sx={{ minWidth: 130 }}><MenuItem value="FULL">Full day</MenuItem><MenuItem value="FIRST_HALF">First half</MenuItem><MenuItem value="SECOND_HALF">Second half</MenuItem></TextField>
        </Stack>
        <Stack direction="row" spacing={1}>
          <TextField type="date" label="To" value={apply.toDate} onChange={(e) => setApply({ ...apply, toDate: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField select label="Part" value={apply.toPart} onChange={(e) => setApply({ ...apply, toPart: e.target.value })} sx={{ minWidth: 130 }}><MenuItem value="FULL">Full day</MenuItem><MenuItem value="FIRST_HALF">First half</MenuItem></TextField>
        </Stack>
        <TextField label="Reason" value={apply.reason} onChange={(e) => setApply({ ...apply, reason: e.target.value })} multiline minRows={2} />
      </FormDialog>
      <FormDialog open={adjustOpen} title="Adjust leave balance" busy={adjustMut.isPending} onClose={() => setAdjustOpen(false)} onSubmit={() => adjustMut.mutate()} maxWidth="xs">
        <TextField select label="Leave type" value={adjust.leaveTypeId} onChange={(e) => setAdjust({ ...adjust, leaveTypeId: e.target.value })}>
          {types.map((t) => <MenuItem key={t.leaveTypeId} value={t.leaveTypeId}>{t.name}</MenuItem>)}
        </TextField>
        <TextField label="Days (negative to reduce)" value={adjust.days} onChange={(e) => setAdjust({ ...adjust, days: e.target.value })} />
        <TextField label="Reason" value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} multiline minRows={2} helperText="Required · recorded in the audit log" />
      </FormDialog>
    </Grid>
  );
}
