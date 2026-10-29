'use client';

import { useState } from 'react';
import Link from 'next/link';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmployeeCreateInput } from '@attendance/contracts';
import { FilterBar } from '@/components/admin/filter-bar';
import { PersonCell } from '@/components/admin/person-cell';
import { DEVICE_STATUS, EMPLOYEE_STATUS } from '@/components/admin/status';
import { DataTable } from '@/components/common/data-table';
import { NamedSelect, useBranches, useDepartments } from '@/components/common/filters';
import { ErrorAlert } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { SoftChip } from '@/components/common/status-chip';
import { ActivationCodeDialog, type IssuedCode } from '@/components/employees/activation-code-dialog';
import { EmployeeCreateDialog } from '@/components/employees/employee-form';
import { formatInr } from '@/lib/format';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

interface EmployeeRow {
  id: string;
  employeeCode: string | null;
  fullName: string;
  phone: string;
  status: string;
  branch: { name: string } | null;
  department: { name: string } | null;
  sites: Array<{ name: string }>;
  device: { status: 'NONE' | 'PENDING' | 'ACTIVE'; model: string | null };
  salary: { basis: string; amount: string } | null;
}

export default function EmployeesPage() {
  const { can, has } = useSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [deviceStatus, setDeviceStatus] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [issued, setIssued] = useState<{ name: string; phone: string; code: IssuedCode } | null>(null);
  const branches = useBranches();
  const departments = useDepartments();
  const params = { page, pageSize, q: q || undefined, status: status || undefined, branchId: branchId || undefined, departmentId: departmentId || undefined, deviceStatus: deviceStatus || undefined };
  const list = useQuery({ queryKey: ['employees', params], queryFn: () => api.getPaged<EmployeeRow>('/employees', params) });
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  const create = useMutation({
    mutationFn: (values: EmployeeCreateInput) => api.post<{ id: string; activationCode: IssuedCode }>('/employees', values),
    onSuccess: (data, values) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setCreateOpen(false);
      setIssued({ name: values.fullName, phone: values.phone, code: data.activationCode });
      notify('Employee added');
    },
    onError: notifyError,
  });

  const exportCodes = async () => {
    setExporting(true);
    try {
      await api.download('/activation-codes/export', 'activation-codes.xlsx', 'POST', { employeeIds: selected });
    } catch (e) {
      notifyError(e);
    } finally {
      setExporting(false);
    }
  };

  const columns: GridColDef<EmployeeRow>[] = [
    { field: 'fullName', headerName: 'Employee', flex: 1, minWidth: 220, renderCell: (p) => <PersonCell name={p.row.fullName} href={`/employees/${p.row.id}`} caption={p.row.employeeCode} /> },
    { field: 'phone', headerName: 'Mobile', width: 140 },
    { field: 'branch', headerName: 'Branch', width: 140, valueGetter: (_, r) => r.branch?.name ?? '' },
    { field: 'department', headerName: 'Department', width: 140, valueGetter: (_, r) => r.department?.name ?? '—' },
    { field: 'sites', headerName: 'Work sites', width: 170, renderCell: (p) => (p.row.sites.length ? p.row.sites.map((s) => s.name).join(', ') : <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600 }}>None — can’t punch</Typography>) },
    { field: 'device', headerName: 'Phone', width: 160, renderCell: (p) => { const d = DEVICE_STATUS[p.row.device.status]; return <SoftChip label={d.label} tone={d.tone} dot />; } },
    ...(can('EMPLOYEE_SALARY') ? [{ field: 'salary', headerName: 'Salary', width: 150, valueGetter: (_: unknown, r: EmployeeRow) => (r.salary ? `${formatInr(r.salary.amount)} / ${r.salary.basis.toLowerCase()}` : '—') } as GridColDef<EmployeeRow>] : []),
    { field: 'status', headerName: 'Status', width: 130, renderCell: (p) => { const s = EMPLOYEE_STATUS[p.row.status] ?? { label: p.row.status, tone: 'default' as const }; return <SoftChip label={s.label} tone={s.tone} />; } },
  ];

  return (
    <>
      <PageHeader
        title="Employees"
        subtitle={`${list.data?.meta.total ?? 0} people. Add someone, then share their activation code so they can sign in to the app.`}
        actions={
          <>
            {can('DEVICES', 'export') && (
              <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} disabled={selected.length === 0} loading={exporting} loadingPosition="start" onClick={exportCodes}>
                Activation codes{selected.length ? ` (${selected.length})` : ''}
              </Button>
            )}
            {can('EMPLOYEES', 'create') && has('BULK_IMPORT') && (
              <Button component={Link} href="/employees/import" variant="outlined" startIcon={<UploadFileOutlinedIcon />}>Bulk upload</Button>
            )}
            {can('EMPLOYEES', 'create') && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>Add employee</Button>
            )}
          </>
        }
      />
      <FilterBar end={can('DEVICES', 'export') ? <Typography variant="caption" color="text.secondary">Tick employees to download their activation codes as a sheet.</Typography> : undefined}>
        <TextField label="Search name, code or mobile" value={q} onChange={(e) => reset(setQ)(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlinedIcon fontSize="small" /></InputAdornment> } }} />
        <NamedSelect label="Branch" value={branchId} onChange={reset(setBranchId)} options={branches.data} allLabel="All branches" />
        <NamedSelect label="Department" value={departmentId} onChange={reset(setDepartmentId)} options={departments.data} allLabel="All departments" />
        <TextField select label="Phone" value={deviceStatus} onChange={(e) => reset(setDeviceStatus)(e.target.value)}>
          <MenuItem value="">Any phone status</MenuItem>
          <MenuItem value="NONE">Not registered</MenuItem>
          <MenuItem value="PENDING">Awaiting approval</MenuItem>
          <MenuItem value="ACTIVE">Registered</MenuItem>
        </TextField>
        <TextField select label="Status" value={status} onChange={(e) => reset(setStatus)(e.target.value)}>
          <MenuItem value="">Active & invited</MenuItem>
          <MenuItem value="ACTIVE">Active</MenuItem>
          <MenuItem value="INVITED">Invited</MenuItem>
          <MenuItem value="DEACTIVATED">Deactivated</MenuItem>
          <MenuItem value="EXITED">Exited</MenuItem>
        </TextField>
      </FilterBar>
      {list.error ? (
        <ErrorAlert error={list.error} onRetry={() => list.refetch()} />
      ) : (
        <DataTable
          rows={list.data?.items ?? []}
          columns={columns}
          loading={list.isLoading}
          total={list.data?.meta.total}
          page={page}
          pageSize={pageSize}
          onPageChange={(p, s) => { setPage(p); setPageSize(s); }}
          checkboxSelection={can('DEVICES', 'export')}
          onRowSelectionModelChange={(m) => setSelected([...(m as unknown as { ids: Set<string> }).ids ?? []].map(String))}
          emptyText={q || branchId || departmentId || deviceStatus || status ? 'No employees match these filters.' : 'No employees yet. Add your first employee to get started.'}
        />
      )}
      <EmployeeCreateDialog open={createOpen} busy={create.isPending} onClose={() => setCreateOpen(false)} onSubmit={(v) => create.mutate(v)} />
      <ActivationCodeDialog open={!!issued} employeeName={issued?.name ?? ''} phone={issued?.phone ?? ''} code={issued?.code ?? null} onClose={() => setIssued(null)} />
    </>
  );
}
