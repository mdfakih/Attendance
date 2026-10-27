'use client';

import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/common/data-table';
import { FormDialog } from '@/components/common/form-dialog';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

interface LeaveType {
  id: string;
  code: string;
  name: string;
  isPaid: boolean;
  allowHalfDay: boolean;
  accrualMode: string;
  annualQuota: number | null;
  monthlyAccrual: number | null;
  carryForwardCap: number | null;
  maxNegativeBalance: number | null;
  backdateLimitDays: number;
  countNonWorkingDays: boolean;
  active: boolean;
}

type Form = Omit<LeaveType, 'id'> & { id?: string };
const empty: Form = { code: '', name: '', isPaid: true, allowHalfDay: true, accrualMode: 'YEARLY_ACCRUAL', annualQuota: 12, monthlyAccrual: null, carryForwardCap: 0, maxNegativeBalance: 0, backdateLimitDays: 7, countNonWorkingDays: false, active: true };
const ACCRUAL: Record<string, string> = { NONE: 'No quota (unlimited / unpaid)', FIXED_QUOTA: 'Fixed yearly quota, no carry-forward', YEARLY_ACCRUAL: 'Yearly quota (prorated for joiners)', MONTHLY_ACCRUAL: 'Accrues every month' };

export default function LeaveTypesPage() {
  const { can } = useSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const types = useQuery({ queryKey: ['leave-types'], queryFn: () => api.get<LeaveType[]>('/leave/types') });
  const save = useMutation({
    mutationFn: (f: Form) => (f.id ? api.put(`/leave/types/${f.id}`, { ...f, id: undefined }) : api.post('/leave/types', f)),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leave-types'] }); setForm(null); notify('Leave type saved'); },
    onError: notifyError,
  });
  const columns: GridColDef<LeaveType>[] = [
    { field: 'code', headerName: 'Code', width: 80 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'isPaid', headerName: 'Paid', width: 80, valueGetter: (_, r) => (r.isPaid ? 'Yes' : 'No') },
    { field: 'accrualMode', headerName: 'Quota', flex: 1, minWidth: 220, valueGetter: (_, r) => `${ACCRUAL[r.accrualMode] ?? r.accrualMode}${r.annualQuota ? ` · ${r.annualQuota}/yr` : ''}${r.monthlyAccrual ? ` · ${r.monthlyAccrual}/mo` : ''}` },
    { field: 'carryForwardCap', headerName: 'Carry forward', width: 120, valueGetter: (_, r) => (r.carryForwardCap === null ? 'Unlimited' : r.carryForwardCap) },
    { field: 'active', headerName: 'Status', width: 90, valueGetter: (_, r) => (r.active ? 'Active' : 'Inactive') },
    { field: 'actions', headerName: '', width: 90, sortable: false, renderCell: (p) => (can('LEAVE_SETUP', 'edit') ? <Button size="small" onClick={() => setForm(p.row)}>Edit</Button> : null) },
  ];
  const num = (v: string) => (v === '' ? null : Number(v));
  return (
    <>
      <PageHeader title="Leave types" subtitle="Approved leave feeds the attendance calendar and payable days." actions={can('LEAVE_SETUP', 'create') && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setForm(empty)}>Add type</Button>} />
      <DataTable rows={types.data ?? []} columns={columns} loading={types.isLoading} height={420} />
      <FormDialog open={!!form} title={form?.id ? 'Edit leave type' : 'Add leave type'} busy={save.isPending} onClose={() => setForm(null)} onSubmit={() => form && save.mutate(form)}>
        {form && (<>
          <Stack direction="row" spacing={1}>
            <TextField label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} sx={{ maxWidth: 120 }} />
            <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </Stack>
          <TextField select label="Quota" value={form.accrualMode} onChange={(e) => setForm({ ...form, accrualMode: e.target.value })}>{Object.entries(ACCRUAL).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}</TextField>
          <Stack direction="row" spacing={1}>
            {(form.accrualMode === 'YEARLY_ACCRUAL' || form.accrualMode === 'FIXED_QUOTA') && <TextField type="number" label="Days per year" value={form.annualQuota ?? ''} onChange={(e) => setForm({ ...form, annualQuota: num(e.target.value) })} />}
            {form.accrualMode === 'MONTHLY_ACCRUAL' && <TextField type="number" label="Days per month" value={form.monthlyAccrual ?? ''} onChange={(e) => setForm({ ...form, monthlyAccrual: num(e.target.value) })} />}
            {form.accrualMode !== 'NONE' && form.accrualMode !== 'FIXED_QUOTA' && <TextField type="number" label="Carry-forward cap" value={form.carryForwardCap ?? ''} onChange={(e) => setForm({ ...form, carryForwardCap: num(e.target.value) })} helperText="Blank = unlimited" />}
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField type="number" label="Allowed negative balance" value={form.maxNegativeBalance ?? 0} onChange={(e) => setForm({ ...form, maxNegativeBalance: num(e.target.value) ?? 0 })} />
            <TextField type="number" label="Backdate limit (days)" value={form.backdateLimitDays} onChange={(e) => setForm({ ...form, backdateLimitDays: Number(e.target.value) })} />
          </Stack>
          <FormControlLabel control={<Checkbox checked={form.isPaid} onChange={(e) => setForm({ ...form, isPaid: e.target.checked })} />} label="Paid leave (unpaid leave reduces pay)" />
          <FormControlLabel control={<Checkbox checked={form.allowHalfDay} onChange={(e) => setForm({ ...form, allowHalfDay: e.target.checked })} />} label="Allow half days" />
          <FormControlLabel control={<Checkbox checked={form.countNonWorkingDays} onChange={(e) => setForm({ ...form, countNonWorkingDays: e.target.checked })} />} label="Count weekly offs & holidays inside the leave" />
          <FormControlLabel control={<Checkbox checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />} label="Active" />
        </>)}
      </FormDialog>
    </>
  );
}
