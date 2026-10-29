'use client';

import { useState } from 'react';
import Link from 'next/link';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import SwapVertOutlinedIcon from '@mui/icons-material/SwapVertOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import type { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FilterBar } from '@/components/admin/filter-bar';
import { PersonCell } from '@/components/admin/person-cell';
import { flagLabel } from '@/components/admin/status';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable } from '@/components/common/data-table';
import { FeatureGate } from '@/components/common/feature-gate';
import { NamedSelect, useBranches, useDepartments } from '@/components/common/filters';
import { ErrorAlert, StatGridSkeleton } from '@/components/common/loading';
import { MonthPicker } from '@/components/common/month-picker';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { StatCard } from '@/components/common/stat-card';
import { SoftChip } from '@/components/common/status-chip';
import { formatInr, formatMinutes, monthLabel, thisMonth } from '@/lib/format';
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

function PayRegister() {
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
  const recompute = useMutation({ mutationFn: () => api.post('/pay/register/recompute', { month }), onSuccess: () => { refresh(); notify('Recalculated from attendance'); }, onError: notifyError });
  const lock = useMutation({ mutationFn: () => api.post('/pay/periods/lock', { month }), onSuccess: () => { refresh(); setLockOpen(false); notify('Month locked'); }, onError: notifyError });
  const unlock = useMutation({ mutationFn: (reason: string) => api.post('/pay/periods/unlock', { month, reason }), onSuccess: () => { refresh(); setUnlockOpen(false); notify('Month reopened'); }, onError: notifyError });
  const data = register.data;
  const locked = data?.status === 'LOCKED';
  const money = (v: unknown) => formatInr(v as string);

  const columns: GridColDef<PayRow>[] = [
    { field: 'name', headerName: 'Employee', flex: 1, minWidth: 220, valueGetter: (_, r) => r.employee.fullName, renderCell: (p) => <PersonCell name={p.row.employee.fullName} href={`/employees/${p.row.employee.id}`} caption={[p.row.employee.employeeCode, p.row.employee.branch].filter(Boolean).join(' · ')} /> },
    { field: 'rate', headerName: 'Salary', width: 150, valueGetter: (_, r) => (r.rate ? `${formatInr(r.rate)} / ${(r.basis ?? '').toLowerCase().replace('ly', '')}` : '—') },
    { field: 'payableDays', headerName: 'Payable days', width: 120, type: 'number' },
    { field: 'lopDays', headerName: 'LOP', width: 70, type: 'number' },
    { field: 'workedMinutes', headerName: 'Hours', width: 90, valueGetter: (_, r) => formatMinutes(r.workedMinutes) },
    { field: 'baseEarned', headerName: 'Base', width: 110, type: 'number', valueFormatter: money },
    { field: 'otEarned', headerName: 'OT', width: 90, type: 'number', valueFormatter: money },
    { field: 'additions', headerName: 'Additions', width: 110, type: 'number', valueFormatter: money },
    { field: 'deductions', headerName: 'Deductions', width: 110, type: 'number', valueFormatter: money },
    { field: 'netEarned', headerName: 'Net earned', width: 130, type: 'number', valueFormatter: money, cellClassName: 'net-cell' },
    { field: 'flags', headerName: 'Flags', width: 180, sortable: false, renderCell: (p) => <Stack direction="row" spacing={0.5}>{p.row.flags.map((f) => <SoftChip key={f} label={flagLabel(f)} tone="warning" />)}</Stack> },
  ];

  return (
    <>
      <PageHeader
        title="Salary register"
        subtitle="Earned pay worked out from attendance, before statutory deductions (PF, ESI, tax)."
        actions={
          <>
            <Button startIcon={<RefreshOutlinedIcon />} variant="outlined" onClick={() => recompute.mutate()} loading={recompute.isPending} loadingPosition="start" disabled={locked}>Recalculate</Button>
            <Button component={Link} href={`/exports?type=SALARY_REGISTER&month=${month}`} variant="outlined" startIcon={<FileDownloadOutlinedIcon />}>Export</Button>
            {can('PAY', 'edit') && !locked && <Button startIcon={<LockOutlinedIcon />} variant="contained" onClick={() => setLockOpen(true)}>Lock month</Button>}
            {isAdmin && locked && <Button startIcon={<LockOpenOutlinedIcon />} color="warning" variant="outlined" onClick={() => setUnlockOpen(true)}>Unlock</Button>}
          </>
        }
      />
      <FilterBar end={data ? <SoftChip label={locked ? `${monthLabel(month)} is locked` : `${monthLabel(month)} is open`} tone={locked ? 'default' : 'success'} icon={locked ? <LockOutlinedIcon /> : <LockOpenOutlinedIcon />} /> : undefined}>
        <MonthPicker value={month} onChange={(m) => { setMonth(m); setPage(1); }} />
        <NamedSelect label="Branch" value={branchId} onChange={(v) => { setBranchId(v); setPage(1); }} options={branches.data} allLabel="All branches" />
        <NamedSelect label="Department" value={departmentId} onChange={(v) => { setDepartmentId(v); setPage(1); }} options={departments.data} allLabel="All departments" />
      </FilterBar>
      {register.error ? (
        <ErrorAlert error={register.error} onRetry={() => register.refetch()} />
      ) : (
        <Stack spacing={2.5}>
          {data ? (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatCard label="Employees" value={data.totals.employees} icon={<PeopleAltOutlinedIcon />} /></Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatCard label="Net earned" value={formatInr(data.totals.netEarned)} icon={<AccountBalanceWalletOutlinedIcon />} tone="success" /></Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatCard label="Additions / deductions" value={`${formatInr(data.totals.additions)} / ${formatInr(data.totals.deductions)}`} icon={<SwapVertOutlinedIcon />} tone="info" /></Grid>
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatCard label="Loss-of-pay days" value={data.totals.lopDays ?? 0} icon={<EventBusyOutlinedIcon />} tone="warning" /></Grid>
            </Grid>
          ) : (
            <StatGridSkeleton count={4} />
          )}
          {data && data.items.length === 0 && (
            <Alert severity="info" action={!locked ? <Button color="inherit" size="small" onClick={() => recompute.mutate()} loading={recompute.isPending}>Recalculate now</Button> : undefined}>
              No pay rows yet for {monthLabel(month)}. Recalculate to work them out from attendance.
            </Alert>
          )}
          <DataTable
            rows={data?.items ?? []}
            columns={columns}
            getRowId={(r) => r.employee.id}
            loading={register.isLoading}
            total={data?.meta.total}
            page={page}
            pageSize={pageSize}
            onPageChange={(p, s) => { setPage(p); setPageSize(s); }}
            emptyText="No pay rows for this month yet."
            sx={{ '& .net-cell': { fontWeight: 700 } }}
          />
        </Stack>
      )}

      <ConfirmDialog
        open={lockOpen}
        title={`Lock ${monthLabel(month)}?`}
        message={lockCheck.data ? (lockCheck.data.warnings.length ? `Warnings: ${lockCheck.data.warnings.map((w) => w.message).join(' ')} Locking freezes all figures; attendance and salary for this month can no longer be edited without an Admin unlocking.` : 'All checks passed. Locking freezes the figures for this month.') : 'Checking the month before locking…'}
        confirmLabel="Lock month"
        busy={lock.isPending || lockCheck.isLoading}
        onClose={() => setLockOpen(false)}
        onConfirm={() => lock.mutate()}
      />
      <ConfirmDialog open={unlockOpen} title={`Reopen ${monthLabel(month)}?`} message="Figures will be recalculated from current attendance. This is recorded in the audit log." confirmLabel="Unlock" destructive reasonLabel="Reason" busy={unlock.isPending} onClose={() => setUnlockOpen(false)} onConfirm={(reason) => unlock.mutate(reason)} />
    </>
  );
}

export default function PayPage() {
  return (
    <FeatureGate feature="PAY_MONITORING">
      <PayRegister />
    </FeatureGate>
  );
}
