'use client';

import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import CurrencyRupeeOutlinedIcon from '@mui/icons-material/CurrencyRupeeOutlined';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import { SALARY_BASES } from '@attendance/contracts';
import { useMutation } from '@tanstack/react-query';
import type { EmployeeDetail } from '@/app/(app)/employees/[id]/page';
import { FormDialog } from '@/components/common/form-dialog';
import { EmptyState } from '@/components/common/loading';
import { SectionCard } from '@/components/common/section-card';
import { useSnackbar } from '@/components/common/snackbar';
import { SoftChip } from '@/components/common/status-chip';
import { formatDate, formatInr, todayIso } from '@/lib/format';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

export const BASIS_LABEL: Record<string, string> = { MONTHLY: 'per month', WEEKLY: 'per week', HOURLY: 'per hour' };

/** Salary revisions over time, with a "Revise" form. Works without the pay module. */
export function SalaryHistoryCard({ employee, onChanged }: { employee: EmployeeDetail; onChanged: () => void }) {
  const { can } = useSession();
  const { notify, notifyError } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [salary, setSalary] = useState({ basis: 'MONTHLY', amount: '', effectiveFrom: todayIso(), revisionReason: '' });
  const save = useMutation({ mutationFn: () => api.post(`/employees/${employee.id}/salary`, salary), onSuccess: () => { onChanged(); setOpen(false); notify('Salary revision saved'); }, onError: notifyError });
  const history = employee.salaryHistory;

  return (
    <SectionCard
      title="Salary history"
      icon={<CurrencyRupeeOutlinedIcon />}
      flush
      action={can('EMPLOYEE_SALARY', 'edit') ? <Button size="small" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Revise</Button> : undefined}
    >
      {!history ? (
        <EmptyState compact title="Salary is hidden" description="You don’t have permission to view salary." />
      ) : history.length === 0 ? (
        <EmptyState compact icon={<CurrencyRupeeOutlinedIcon />} title="No salary set" description="Pay can’t be worked out until a salary is added." />
      ) : (
        <Table size="small">
          <TableHead><TableRow><TableCell sx={{ pl: 2.5 }}>From</TableCell><TableCell>To</TableCell><TableCell align="right" sx={{ pr: 2.5 }}>Amount</TableCell></TableRow></TableHead>
          <TableBody>
            {history.map((h) => (
              <TableRow key={h.id}>
                <TableCell sx={{ pl: 2.5 }}>{formatDate(h.effectiveFrom)}</TableCell>
                <TableCell>{h.effectiveTo ? formatDate(h.effectiveTo) : <SoftChip label="Current" tone="success" />}</TableCell>
                <TableCell align="right" sx={{ pr: 2.5, fontWeight: 600 }}>{formatInr(h.amount)} {BASIS_LABEL[h.basis]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <FormDialog open={open} title="Salary revision" subtitle="The new salary applies from the date you choose." busy={save.isPending} onClose={() => setOpen(false)} onSubmit={() => save.mutate()} maxWidth="xs">
        <TextField select label="Basis" value={salary.basis} onChange={(e) => setSalary({ ...salary, basis: e.target.value })}>
          {SALARY_BASES.map((b) => <MenuItem key={b} value={b}>{BASIS_LABEL[b]}</MenuItem>)}
        </TextField>
        <TextField label="Amount (₹)" value={salary.amount} onChange={(e) => setSalary({ ...salary, amount: e.target.value })} />
        <TextField type="date" label="Effective from" value={salary.effectiveFrom} onChange={(e) => setSalary({ ...salary, effectiveFrom: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} helperText="Must be in an open (unlocked) month" />
        <TextField label="Reason" value={salary.revisionReason} onChange={(e) => setSalary({ ...salary, revisionReason: e.target.value })} />
      </FormDialog>
    </SectionCard>
  );
}
