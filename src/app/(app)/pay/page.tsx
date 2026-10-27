'use client';

import { useState } from 'react';
import Link from 'next/link';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import RefreshIcon from '@mui/icons-material/Refresh';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable } from '@/components/common/data-table';
import { NamedSelect, useBranches, useDepartments } from '@/components/common/filters';
import { MonthPicker } from '@/components/common/month-picker';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { formatInr, formatMinutes, thisMonth } from '@/lib/format';
import { tenantHttp, api } from '@/lib/http';
import { useSession } from '@/lib/session';

interface PayRow {
  employee: { id: string; fullName: string; employeeCode: string | null; branch: string | null; department: string | null };
  status: string;
  basis: string | null;
  rate: string | null;
  payableDays: number | null;
  lopDays: number | null;
  workedMinutes: number;
  otMinutes: number;
  baseEarned: string;
  otEarned: string;
  additions: string;
  deductions: string;
  netEarned: string;
  projectedNet: string | null;
  flags: string[];
}

interface Register {
  month: string;
  status: 'OPEN' | 'LOCKED';
  lockedAt: string | null;
  items: PayRow[];
  meta: { total: number };
  totals: { employees: number; netEarned: string | null; additions: string | null; deductions: string | null; lopDays: number | null };
}

interface LockCheck {
  warnings: Array<{ code: string; message: string }>;
  canLock: boolean;
}

export default function PayPage() {
  const { can, isAdmin } = useSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(thisMonth());
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [lockOpen, setLockOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const params = { month, branchId: branchId || undefined, departmentId: departmentId || undefined, page, pageSize };
  const register = useQuery({ queryKey: ['pay-register', params], queryFn: async () => (await tenantHttp.get<{ data: Register }>('/pay/register', { params })).data.data });
  const lockCheck = useQuery({ queryKey: ['pay-lock-check', month], queryFn: () => api.get<LockCheck>(`/pay/periods/${month}/lock-check`), enabled: lockOpen });
  const branches = useBranches();
  const departments = useDepartments();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['pay-register'] });
  const recompute = useMutation({ mutationFn: () => api.post('/pay/register/recompute', { month }), onSuccess: () => { refresh(); notify('Recalculated'); }, onError: notifyError });
  const lock = useMutation({ mutationFn: () => api.post('/pay/periods/lock', { month }), onSuccess: () => { refresh(); setLockOpen(false); notify('Month locked'); }, onError: notifyError });
  const unlock = useMutation({ mutationFn: (reason: string) => api.post('/pay/periods/unlock', { month, reason }), onSuccess: () => { refresh(); setUnlockOpen(false); notify('Month reopened'); }, onError: notifyError });
  const data = register.data;
  const locked = data?.status === 'LOCKED';

  const columns: GridColDef<PayRow>[] = [
    { field: 'code', headerName: 'Code', width: 80, valueGetter: (_, r) => r.employee.employeeCode ?? '' },
    { field: 'name', headerName: 'Employee', flex: 1, minWidth: 180, valueGetter: (_, r) => r.employee.fullName, renderCell: (p) => <Link href={`/employees/${p.row.employee.id}`}>{p.row.employee.fullName}</Link> },
    { field: 'branch', headerName: 'Branch', width: 130, valueGetter: (_, r) => r.employee.branch ?? '' },
    { field: 'rate', headerName: 'Salary', width: 150, valueGetter: (_, r) => (r.rate ? `${formatInr(r.rate)} / ${(r.basis ?? '').toLowerCase().replace('ly', '')}` : '—') },
    { field: 'payableDays', headerName: 'Payable days', width: 110, type: 'number' },
    { field: 'lopDays', headerName: 'LOP', width: 70, type: 'number' },
    { field: 'workedMinutes', headerName: 'Hours', width: 90, valueGetter: (_, r) => formatMinutes(r.workedMinutes) },
    { field: 'baseEarned', headerName: 'Base', width: 110, type: 'number', valueFormatter: (v) => formatInr(v as string) },
    { field: 'otEarned', headerName: 'OT', width: 90, type: 'number', valueFormatter: (v) => formatInr(v as string) },
    { field: 'additions', headerName: 'Additions', width: 100, type: 'number', valueFormatter: (v) => formatInr(v as string) },
    { field: 'deductions', headerName: 'Deductions', width: 100, type: 'number', valueFormatter: (v) => formatInr(v as string) },
    { field: 'netEarned', headerName: 'Net earned', width: 120, type: 'number', valueFormatter: (v) => formatInr(v as string) },
    { field: 'flags', headerName: 'Flags', width: 160, renderCell: (p) => <Stack direction="row" spacing={0.5}>{p.row.flags.map((f) => <Chip key={f} size="small" label={f.replace(/_/g, ' ').toLowerCase()} color="warning" variant="outlined" />)}</Stack> },
  ];

  return (
    <>
      <PageHeader
        title="Salary register"
        subtitle="Earned pay from attendance, before statutory deductions"
        actions={
          <>
            <Button startIcon={<RefreshIcon />} variant="outlined" onClick={() => recompute.mutate()} disabled={recompute.isPending || locked}>Recalculate</Button>
            <Button component={Link} href={`/exports?type=SALARY_REGISTER&month=${month}`} variant="outlined">Export</Button>
            {can('PAY', 'edit') && !locked && <Button startIcon={<LockIcon />} variant="contained" onClick={() => setLockOpen(true)}>Lock month</Button>}
            {isAdmin && locked && <Button startIcon={<LockOpenIcon />} color="warning" variant="outlined" onClick={() => setUnlockOpen(true)}>Unlock</Button>}
          </>
        }
      />
      <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <MonthPicker value={month} onChange={(m) => { setMonth(m); setPage(1); }} />
        <NamedSelect label="Branch" value={branchId} onChange={setBranchId} options={branches.data} />
        <NamedSelect label="Department" value={departmentId} onChange={setDepartmentId} options={departments.data} />
        {data && <Chip label={locked ? 'Locked' : 'Open'} color={locked ? 'default' : 'success'} variant={locked ? 'filled' : 'outlined'} />}
      </Stack>
      {data && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6, md: 3 }}><Card><CardContent><Typography variant="body2" color="text.secondary">Employees</Typography><Typography variant="h5">{data.totals.employees}</Typography></CardContent></Card></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Card><CardContent><Typography variant="body2" color="text.secondary">Net earned</Typography><Typography variant="h5">{formatInr(data.totals.netEarned)}</Typography></CardContent></Card></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Card><CardContent><Typography variant="body2" color="text.secondary">Additions / deductions</Typography><Typography variant="h5">{formatInr(data.totals.additions)} / {formatInr(data.totals.deductions)}</Typography></CardContent></Card></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Card><CardContent><Typography variant="body2" color="text.secondary">LOP days</Typography><Typography variant="h5">{data.totals.lopDays ?? 0}</Typography></CardContent></Card></Grid>
        </Grid>
      )}
      {data && data.items.length === 0 && !register.isLoading && <Alert severity="info" sx={{ mb: 2 }}>No pay rows yet for this month. Click Recalculate to compute from attendance.</Alert>}
      <DataTable rows={data?.items ?? []} columns={columns} getRowId={(r) => r.employee.id} loading={register.isLoading} total={data?.meta.total} page={page} pageSize={pageSize} onPageChange={(p, s) => { setPage(p); setPageSize(s); }} />

      <ConfirmDialog
        open={lockOpen}
        title={`Lock ${month}?`}
        message={lockCheck.data ? (lockCheck.data.warnings.length ? `Warnings: ${lockCheck.data.warnings.map((w) => w.message).join(' ')} Locking freezes all figures; attendance and salary for this month can no longer be edited without an Admin unlocking.` : 'All checks passed. Locking freezes the figures for this month.') : 'Checking…'}
        confirmLabel="Lock month"
        busy={lock.isPending || lockCheck.isLoading}
        onClose={() => setLockOpen(false)}
        onConfirm={() => lock.mutate()}
      />
      <ConfirmDialog open={unlockOpen} title={`Reopen ${month}?`} message="Figures will be recalculated from current attendance. This is recorded in the audit log." confirmLabel="Unlock" destructive reasonLabel="Reason" busy={unlock.isPending} onClose={() => setUnlockOpen(false)} onConfirm={(reason) => unlock.mutate(reason)} />
    </>
  );
}
