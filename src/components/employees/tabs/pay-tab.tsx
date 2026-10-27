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
import { SALARY_BASES } from '@attendance/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormDialog } from '@/components/common/form-dialog';
import { Loading } from '@/components/common/loading';
import { MonthPicker } from '@/components/common/month-picker';
import { useSnackbar } from '@/components/common/snackbar';
import type { EmployeeDetail } from '@/app/(app)/employees/[id]/page';
import { formatDate, formatInr, formatMinutes, thisMonth, todayIso } from '@/lib/format';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

interface PaySummary {
  status: string;
  basis: string | null;
  rate: string | null;
  payableDays: number | null;
  lopDays: number | null;
  presentDays: number | null;
  paidLeaveDays: number | null;
  workedMinutes: number;
  otMinutes: number;
  baseEarned: string;
  otEarned: string;
  additions: string;
  deductions: string;
  netEarned: string;
  projectedNet: string | null;
  mtdThrough: string | null;
  flags: string[];
}

interface Adjustment {
  id: string;
  direction: string;
  label: string;
  amount: string;
  reason: string;
  voided: boolean;
  createdAt: string;
}

const BASIS_LABEL: Record<string, string> = { MONTHLY: 'per month', WEEKLY: 'per week', HOURLY: 'per hour' };

export function EmployeePayTab({ employee, onChanged }: { employee: EmployeeDetail; onChanged: () => void }) {
  const { can } = useSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(thisMonth());
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [adjOpen, setAdjOpen] = useState(false);
  const [salary, setSalary] = useState({ basis: 'MONTHLY', amount: '', effectiveFrom: todayIso(), revisionReason: '' });
  const [adj, setAdj] = useState({ kind: 'ADDITION', label: '', amount: '', reason: '' });
  const pay = useQuery({ queryKey: ['employee-pay', employee.id, month], queryFn: () => api.get<{ summary: PaySummary | null; adjustments: Adjustment[] }>(`/pay/employees/${employee.id}`, { month }) });
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ['employee-pay', employee.id] }); onChanged(); };
  const addSalary = useMutation({ mutationFn: () => api.post(`/employees/${employee.id}/salary`, salary), onSuccess: () => { refresh(); setSalaryOpen(false); notify('Salary revision saved'); }, onError: notifyError });
  const addAdj = useMutation({ mutationFn: () => api.post('/pay/adjustments', { employeeId: employee.id, month, ...adj }), onSuccess: () => { refresh(); setAdjOpen(false); notify('Adjustment added'); }, onError: notifyError });
  const voidAdj = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => api.post(`/pay/adjustments/${id}/void`, { reason }), onSuccess: () => { refresh(); notify('Adjustment removed'); }, onError: notifyError });
  const s = pay.data?.summary;
  const locked = s?.status === 'LOCKED';

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Card><CardContent>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <MonthPicker value={month} onChange={setMonth} />
            {locked ? <Chip label="Locked" size="small" /> : <Chip label="Open" size="small" color="success" variant="outlined" />}
          </Stack>
          {pay.isLoading ? <Loading /> : !s ? <Typography color="text.secondary">No pay data for this month yet.</Typography> : (
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>{s.flags.map((f) => <Chip key={f} size="small" label={f.replace(/_/g, ' ').toLowerCase()} color="warning" variant="outlined" />)}</Stack>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{formatInr(s.netEarned)} <Typography component="span" color="text.secondary">{s.mtdThrough ? `earned till ${formatDate(s.mtdThrough)}` : 'earned this month'}</Typography></Typography>
              {s.projectedNet && <Typography color="text.secondary">Projected for full month: {formatInr(s.projectedNet)}</Typography>}
              <Table size="small">
                <TableBody>
                  <TableRow><TableCell>Salary</TableCell><TableCell align="right">{s.rate ? `${formatInr(s.rate)} ${BASIS_LABEL[s.basis ?? ''] ?? ''}` : '—'}</TableCell></TableRow>
                  <TableRow><TableCell>Payable days</TableCell><TableCell align="right">{s.payableDays ?? '—'} <Typography component="span" variant="caption" color="text.secondary">(LOP {s.lopDays ?? 0})</Typography></TableCell></TableRow>
                  <TableRow><TableCell>Hours worked</TableCell><TableCell align="right">{formatMinutes(s.workedMinutes)}{s.otMinutes ? ` + ${formatMinutes(s.otMinutes)} OT` : ''}</TableCell></TableRow>
                  <TableRow><TableCell>Base pay</TableCell><TableCell align="right">{formatInr(s.baseEarned)}</TableCell></TableRow>
                  {Number(s.otEarned) > 0 && <TableRow><TableCell>Overtime pay</TableCell><TableCell align="right">{formatInr(s.otEarned)}</TableCell></TableRow>}
                  <TableRow><TableCell>Additions</TableCell><TableCell align="right">{formatInr(s.additions)}</TableCell></TableRow>
                  <TableRow><TableCell>Deductions</TableCell><TableCell align="right">− {formatInr(s.deductions)}</TableCell></TableRow>
                </TableBody>
              </Table>
              <Typography variant="caption" color="text.secondary">Earned before statutory deductions (PF, ESI, tax). Basic pay-monitoring tier.</Typography>
            </Stack>
          )}
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 1 }}>
            <Typography variant="h6">Additions & deductions</Typography>
            {can('PAY', 'create') && !locked && <Button size="small" startIcon={<AddIcon />} onClick={() => setAdjOpen(true)}>Add</Button>}
          </Stack>
          {(pay.data?.adjustments.length ?? 0) === 0 ? <Typography color="text.secondary" variant="body2">None this month.</Typography> : (
            <Table size="small">
              <TableHead><TableRow><TableCell>Item</TableCell><TableCell>Reason</TableCell><TableCell align="right">Amount</TableCell><TableCell /></TableRow></TableHead>
              <TableBody>
                {pay.data?.adjustments.map((a) => (
                  <TableRow key={a.id} sx={{ opacity: a.voided ? 0.5 : 1 }}>
                    <TableCell>{a.label}{a.voided ? ' (removed)' : ''}</TableCell>
                    <TableCell>{a.reason}</TableCell>
                    <TableCell align="right" sx={{ color: a.direction === 'DEDUCTION' ? 'error.main' : 'success.main' }}>{a.direction === 'DEDUCTION' ? '−' : '+'} {formatInr(a.amount)}</TableCell>
                    <TableCell align="right">{!a.voided && !locked && can('PAY', 'delete') && <Button size="small" color="warning" onClick={() => { const r = window.prompt('Reason for removing'); if (r && r.trim().length >= 5) voidAdj.mutate({ id: a.id, reason: r.trim() }); }}>Remove</Button>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent></Card>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Card><CardContent>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">Salary history</Typography>
            {can('EMPLOYEE_SALARY', 'edit') && <Button size="small" startIcon={<AddIcon />} onClick={() => setSalaryOpen(true)}>Revise</Button>}
          </Stack>
          {!employee.salaryHistory ? <Typography color="text.secondary" variant="body2">You do not have permission to view salary.</Typography> : employee.salaryHistory.length === 0 ? <Typography color="text.secondary" variant="body2">No salary set. Pay cannot be calculated until one is added.</Typography> : (
            <Table size="small">
              <TableHead><TableRow><TableCell>From</TableCell><TableCell>To</TableCell><TableCell align="right">Amount</TableCell></TableRow></TableHead>
              <TableBody>
                {employee.salaryHistory.map((h) => (
                  <TableRow key={h.id}><TableCell>{formatDate(h.effectiveFrom)}</TableCell><TableCell>{h.effectiveTo ? formatDate(h.effectiveTo) : 'current'}</TableCell><TableCell align="right">{formatInr(h.amount)} {BASIS_LABEL[h.basis]}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent></Card>
      </Grid>

      <FormDialog open={salaryOpen} title="Salary revision" busy={addSalary.isPending} onClose={() => setSalaryOpen(false)} onSubmit={() => addSalary.mutate()} maxWidth="xs">
        <TextField select label="Basis" value={salary.basis} onChange={(e) => setSalary({ ...salary, basis: e.target.value })}>
          {SALARY_BASES.map((b) => <MenuItem key={b} value={b}>{BASIS_LABEL[b]}</MenuItem>)}
        </TextField>
        <TextField label="Amount (₹)" value={salary.amount} onChange={(e) => setSalary({ ...salary, amount: e.target.value })} />
        <TextField type="date" label="Effective from" value={salary.effectiveFrom} onChange={(e) => setSalary({ ...salary, effectiveFrom: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} helperText="Must be in an open (unlocked) month" />
        <TextField label="Reason" value={salary.revisionReason} onChange={(e) => setSalary({ ...salary, revisionReason: e.target.value })} />
      </FormDialog>
      <FormDialog open={adjOpen} title="Add addition or deduction" busy={addAdj.isPending} onClose={() => setAdjOpen(false)} onSubmit={() => addAdj.mutate()} maxWidth="xs">
        <TextField select label="Type" value={adj.kind} onChange={(e) => setAdj({ ...adj, kind: e.target.value })}>
          <MenuItem value="ADDITION">Addition (bonus, incentive, arrear)</MenuItem>
          <MenuItem value="DEDUCTION">Deduction (advance recovery, fine)</MenuItem>
        </TextField>
        <TextField label="Label" value={adj.label} onChange={(e) => setAdj({ ...adj, label: e.target.value })} placeholder="e.g. Diwali bonus" />
        <TextField label="Amount (₹)" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} />
        <TextField label="Reason" value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} multiline minRows={2} helperText="Required · recorded in the audit log" />
      </FormDialog>
    </Grid>
  );
}
