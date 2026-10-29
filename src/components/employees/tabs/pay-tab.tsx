'use client';

import { useState, type ReactNode } from 'react';
import AddIcon from '@mui/icons-material/Add';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import SwapVertOutlinedIcon from '@mui/icons-material/SwapVertOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
import type { EmployeeDetail } from '@/app/(app)/employees/[id]/page';
import { flagLabel } from '@/components/admin/status';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormDialog } from '@/components/common/form-dialog';
import { EmptyState, ErrorAlert, Loading } from '@/components/common/loading';
import { MonthPicker } from '@/components/common/month-picker';
import { SectionCard } from '@/components/common/section-card';
import { useSnackbar } from '@/components/common/snackbar';
import { SoftChip } from '@/components/common/status-chip';
import { formatDate, formatInr, formatMinutes, thisMonth } from '@/lib/format';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';
import { BASIS_LABEL, SalaryHistoryCard } from '../salary-history-card';

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

function Line({ label, value }: { label: string; value: ReactNode }) {
  return (
    <TableRow>
      <TableCell sx={{ pl: 0, color: 'text.secondary' }}>{label}</TableCell>
      <TableCell align="right" sx={{ pr: 0, fontWeight: 600 }}>{value}</TableCell>
    </TableRow>
  );
}

export function EmployeePayTab({ employee, onChanged }: { employee: EmployeeDetail; onChanged: () => void }) {
  const { can } = useSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(thisMonth());
  const [adjOpen, setAdjOpen] = useState(false);
  const [removing, setRemoving] = useState<Adjustment | null>(null);
  const [adj, setAdj] = useState({ kind: 'ADDITION', label: '', amount: '', reason: '' });
  const pay = useQuery({ queryKey: ['employee-pay', employee.id, month], queryFn: () => api.get<{ summary: PaySummary | null; adjustments: Adjustment[] }>(`/pay/employees/${employee.id}`, { month }) });
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ['employee-pay', employee.id] }); onChanged(); };
  const addAdj = useMutation({ mutationFn: () => api.post('/pay/adjustments', { employeeId: employee.id, month, ...adj }), onSuccess: () => { refresh(); setAdjOpen(false); notify('Adjustment added'); }, onError: notifyError });
  const voidAdj = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => api.post(`/pay/adjustments/${id}/void`, { reason }), onSuccess: () => { refresh(); setRemoving(null); notify('Adjustment removed'); }, onError: notifyError });
  const s = pay.data?.summary;
  const locked = s?.status === 'LOCKED';
  const adjustments = pay.data?.adjustments ?? [];

  return (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Stack spacing={2.5}>
          <SectionCard
            title="Earned pay"
            icon={<AccountBalanceWalletOutlinedIcon />}
            action={<SoftChip label={locked ? 'Month locked' : 'Month open'} tone={locked ? 'default' : 'success'} dot />}
          >
            <Box sx={{ mb: 2 }}><MonthPicker value={month} onChange={setMonth} /></Box>
            {pay.isLoading ? <Loading /> : pay.error ? <ErrorAlert error={pay.error} onRetry={() => pay.refetch()} /> : !s ? (
              <EmptyState compact icon={<AccountBalanceWalletOutlinedIcon />} title="No pay data for this month yet" description="Pay is worked out from attendance once a salary is set." />
            ) : (
              <Stack spacing={1.5}>
                <Box>
                  <Typography sx={{ fontFamily: 'var(--font-display), inherit', fontWeight: 800, fontSize: '2rem', lineHeight: 1.2 }}>{formatInr(s.netEarned)}</Typography>
                  <Typography variant="body2" color="text.secondary">{s.mtdThrough ? `Earned till ${formatDate(s.mtdThrough)}` : 'Earned this month'}{s.projectedNet ? ` · about ${formatInr(s.projectedNet)} for the full month` : ''}</Typography>
                </Box>
                {s.flags.length > 0 && <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>{s.flags.map((f) => <SoftChip key={f} label={flagLabel(f)} tone="warning" />)}</Stack>}
                <Table size="small">
                  <TableBody>
                    <Line label="Salary" value={s.rate ? `${formatInr(s.rate)} ${BASIS_LABEL[s.basis ?? ''] ?? ''}` : '—'} />
                    <Line label="Payable days" value={<>{s.payableDays ?? '—'} <Typography component="span" variant="caption" color="text.secondary">(LOP {s.lopDays ?? 0})</Typography></>} />
                    <Line label="Hours worked" value={`${formatMinutes(s.workedMinutes)}${s.otMinutes ? ` + ${formatMinutes(s.otMinutes)} OT` : ''}`} />
                    <Line label="Base pay" value={formatInr(s.baseEarned)} />
                    {Number(s.otEarned) > 0 && <Line label="Overtime pay" value={formatInr(s.otEarned)} />}
                    <Line label="Additions" value={formatInr(s.additions)} />
                    <Line label="Deductions" value={`− ${formatInr(s.deductions)}`} />
                  </TableBody>
                </Table>
                <Typography variant="caption" color="text.secondary">Earned before statutory deductions (PF, ESI, tax).</Typography>
              </Stack>
            )}
          </SectionCard>
          <SectionCard
            title="Additions & deductions"
            icon={<SwapVertOutlinedIcon />}
            flush
            action={can('PAY', 'create') && !locked ? <Button size="small" startIcon={<AddIcon />} onClick={() => setAdjOpen(true)}>Add</Button> : undefined}
          >
            {adjustments.length === 0 ? <EmptyState compact title="Nothing added this month" description="Add a bonus, incentive, advance recovery or fine." /> : (
              <Table size="small">
                <TableHead><TableRow><TableCell sx={{ pl: 2.5 }}>Item</TableCell><TableCell>Reason</TableCell><TableCell align="right">Amount</TableCell><TableCell sx={{ pr: 2.5 }} /></TableRow></TableHead>
                <TableBody>
                  {adjustments.map((a) => (
                    <TableRow key={a.id} sx={{ opacity: a.voided ? 0.5 : 1 }}>
                      <TableCell sx={{ pl: 2.5, fontWeight: 600 }}>{a.label}{a.voided ? ' (removed)' : ''}</TableCell>
                      <TableCell>{a.reason}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: a.direction === 'DEDUCTION' ? 'error.main' : 'success.main' }}>{a.direction === 'DEDUCTION' ? '−' : '+'} {formatInr(a.amount)}</TableCell>
                      <TableCell align="right" sx={{ pr: 2.5 }}>{!a.voided && !locked && can('PAY', 'delete') && <Button size="small" color="warning" onClick={() => setRemoving(a)}>Remove</Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <SalaryHistoryCard employee={employee} onChanged={refresh} />
      </Grid>

      <FormDialog open={adjOpen} title="Add addition or deduction" subtitle={`Applies to ${employee.fullName}’s pay for the selected month.`} busy={addAdj.isPending} onClose={() => setAdjOpen(false)} onSubmit={() => addAdj.mutate()} maxWidth="xs">
        <TextField select label="Type" value={adj.kind} onChange={(e) => setAdj({ ...adj, kind: e.target.value })}>
          <MenuItem value="ADDITION">Addition (bonus, incentive, arrear)</MenuItem>
          <MenuItem value="DEDUCTION">Deduction (advance recovery, fine)</MenuItem>
        </TextField>
        <TextField label="Label" value={adj.label} onChange={(e) => setAdj({ ...adj, label: e.target.value })} placeholder="e.g. Diwali bonus" />
        <TextField label="Amount (₹)" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} />
        <TextField label="Reason" value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} multiline minRows={2} helperText="Required · recorded in the audit log" />
      </FormDialog>
      <ConfirmDialog
        open={!!removing}
        title="Remove this item?"
        message={removing ? `${removing.label} (${formatInr(removing.amount)}) will no longer count towards pay.` : ''}
        confirmLabel="Remove"
        destructive
        reasonLabel="Reason for removing"
        busy={voidAdj.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={(reason) => removing && voidAdj.mutate({ id: removing.id, reason })}
      />
    </Grid>
  );
}
