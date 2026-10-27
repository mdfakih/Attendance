'use client';

import { useState } from 'react';
import Link from 'next/link';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmployeeCreateInput } from '@attendance/contracts';
import { DataTable } from '@/components/common/data-table';
import { NamedSelect, useBranches, useDepartments } from '@/components/common/filters';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
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

const DEVICE_LABEL = { NONE: 'No phone', PENDING: 'Awaiting approval', ACTIVE: 'Registered' } as const;
const DEVICE_COLOR = { NONE: 'default', PENDING: 'warning', ACTIVE: 'success' } as const;

export default function EmployeesPage() {
  const { can } = useSession();
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
  const [createOpen, setCreateOpen] = useState(false);
  const [issued, setIssued] = useState<{ name: string; phone: string; code: IssuedCode } | null>(null);
  const branches = useBranches();
  const departments = useDepartments();
  const params = { page, pageSize, q: q || undefined, status: status || undefined, branchId: branchId || undefined, departmentId: departmentId || undefined, deviceStatus: deviceStatus || undefined };
  const list = useQuery({ queryKey: ['employees', params], queryFn: () => api.getPaged<EmployeeRow>('/employees', params) });

  const create = useMutation({
    mutationFn: (values: EmployeeCreateInput) => api.post<{ id: string; activationCode: IssuedCode }>('/employees', values),
    onSuccess: (data, values) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setCreateOpen(false);
      setIssued({ name: values.fullName, phone: values.phone, code: data.activationCode });
      notify('Employee created');
    },
    onError: notifyError,
  });

  const exportCodes = async () => {
    try {
      await api.download('/activation-codes/export', 'activation-codes.xlsx', 'POST', { employeeIds: selected });
    } catch (e) {
      notifyError(e);
    }
  };

  const columns: GridColDef<EmployeeRow>[] = [
    { field: 'employeeCode', headerName: 'Code', width: 90 },
    { field: 'fullName', headerName: 'Name', flex: 1, minWidth: 180, renderCell: (p) => <Link href={`/employees/${p.row.id}`}>{p.value}</Link> },
    { field: 'phone', headerName: 'Mobile', width: 140 },
    { field: 'branch', headerName: 'Branch', width: 140, valueGetter: (_, r) => r.branch?.name ?? '' },
    { field: 'department', headerName: 'Department', width: 140, valueGetter: (_, r) => r.department?.name ?? '' },
    { field: 'sites', headerName: 'Sites', width: 160, valueGetter: (_, r) => r.sites.map((s) => s.name).join(', ') },
    { field: 'device', headerName: 'Phone', width: 150, renderCell: (p) => <Chip size="small" label={DEVICE_LABEL[p.row.device.status]} color={DEVICE_COLOR[p.row.device.status]} variant="outlined" /> },
    ...(can('EMPLOYEE_SALARY') ? [{ field: 'salary', headerName: 'Salary', width: 140, valueGetter: (_: unknown, r: EmployeeRow) => (r.salary ? `${formatInr(r.salary.amount)} / ${r.salary.basis.toLowerCase()}` : '—') } as GridColDef<EmployeeRow>] : []),
    { field: 'status', headerName: 'Status', width: 110 },
  ];

  return (
    <>
      <PageHeader
        title="Employees"
        subtitle={`${list.data?.meta.total ?? 0} employees`}
        actions={
          <>
            {can('DEVICES', 'export') && (
              <Button variant="outlined" startIcon={<DownloadIcon />} disabled={selected.length === 0} onClick={exportCodes}>
                Activation codes ({selected.length})
              </Button>
            )}
            {can('EMPLOYEES', 'create') && (
              <Button component={Link} href="/employees/import" variant="outlined">Bulk upload</Button>
            )}
            {can('EMPLOYEES', 'create') && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>Add employee</Button>
            )}
          </>
        }
      />
      <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', mb: 2 }}>
        <TextField label="Search name, code, mobile" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} sx={{ minWidth: 240 }} />
        <NamedSelect label="Branch" value={branchId} onChange={(v) => { setBranchId(v); setPage(1); }} options={branches.data} />
        <NamedSelect label="Department" value={departmentId} onChange={(v) => { setDepartmentId(v); setPage(1); }} options={departments.data} />
        <TextField select label="Phone" value={deviceStatus} onChange={(e) => setDeviceStatus(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="NONE">Not registered</MenuItem>
          <MenuItem value="PENDING">Awaiting approval</MenuItem>
          <MenuItem value="ACTIVE">Registered</MenuItem>
        </TextField>
        <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">Active & invited</MenuItem>
          <MenuItem value="ACTIVE">Active</MenuItem>
          <MenuItem value="INVITED">Invited</MenuItem>
          <MenuItem value="DEACTIVATED">Deactivated</MenuItem>
          <MenuItem value="EXITED">Exited</MenuItem>
        </TextField>
      </Stack>
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
      />
      <EmployeeCreateDialog open={createOpen} busy={create.isPending} onClose={() => setCreateOpen(false)} onSubmit={(v) => create.mutate(v)} />
      <ActivationCodeDialog open={!!issued} employeeName={issued?.name ?? ''} phone={issued?.phone ?? ''} code={issued?.code ?? null} onClose={() => setIssued(null)} />
    </>
  );
}
