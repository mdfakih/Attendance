'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { FilterBar } from '@/components/admin/filter-bar';
import { PersonCell } from '@/components/admin/person-cell';
import { flagLabel } from '@/components/admin/status';
import { DataTable } from '@/components/common/data-table';
import { NamedSelect, useBranches, useDepartments, useSites } from '@/components/common/filters';
import { ErrorAlert } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { SoftChip, StatusChip } from '@/components/common/status-chip';
import { formatDate, formatMinutes, formatOutside, formatTime, REG_STATE_COLOR, STATUS_LABEL, todayIso } from '@/lib/format';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

interface DailyRow {
  employee: { id: string; fullName: string; employeeCode: string | null; branch: { name: string } | null };
  status: string;
  statusSource: string;
  punchCount: number;
  firstPunchAt: string | null;
  lastPunchAt: string | null;
  workedMinutes: number;
  outsideMinutes: number;
  regState: string;
  isLate: boolean;
  lateMinutes: number;
  isMissingOut: boolean;
  otMinutes: number;
  flags: string[];
}

function DailyPage() {
  const search = useSearchParams();
  const { has } = useSession();
  const [date, setDate] = useState(search.get('date') ?? todayIso());
  const [status, setStatus] = useState(search.get('status') ?? '');
  const [late, setLate] = useState(search.get('late') === 'true');
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const params = { date, status: status || undefined, late: late || undefined, branchId: branchId || undefined, departmentId: departmentId || undefined, siteId: siteId || undefined, q: q || undefined, page, pageSize };
  const list = useQuery({ queryKey: ['attendance-daily', params], queryFn: () => api.getPaged<DailyRow>('/attendance/daily', params) });
  const branches = useBranches();
  const departments = useDepartments();
  const sites = useSites();
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  const columns: GridColDef<DailyRow>[] = [
    { field: 'name', headerName: 'Employee', flex: 1, minWidth: 220, valueGetter: (_, r) => r.employee.fullName, renderCell: (p) => <PersonCell name={p.row.employee.fullName} href={`/employees/${p.row.employee.id}`} caption={[p.row.employee.employeeCode, p.row.employee.branch?.name].filter(Boolean).join(' · ')} /> },
    { field: 'status', headerName: 'Status', width: 150, renderCell: (p) => <StatusChip status={p.row.status} /> },
    { field: 'firstPunchAt', headerName: 'In', width: 80, valueGetter: (_, r) => formatTime(r.firstPunchAt) },
    { field: 'lastPunchAt', headerName: 'Last', width: 80, valueGetter: (_, r) => (r.punchCount > 1 ? formatTime(r.lastPunchAt) : '—') },
    { field: 'workedMinutes', headerName: 'Hours', width: 90, valueGetter: (_, r) => formatMinutes(r.workedMinutes) },
    { field: 'lateMinutes', headerName: 'Late', width: 90, renderCell: (p) => (p.row.isLate ? <SoftChip label={`${p.row.lateMinutes} min`} tone="warning" /> : null) },
    {
      field: 'flags', headerName: 'Notes', flex: 1, minWidth: 220, sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5} sx={{ overflow: 'hidden' }}>
          {p.row.statusSource === 'MANUAL' && <SoftChip label="Set manually" tone="info" />}
          {p.row.outsideMinutes > 0 && has('EXTRA_TIME') && <SoftChip label={formatOutside(p.row.outsideMinutes, p.row.regState)} tone={REG_STATE_COLOR[p.row.regState] ?? 'default'} />}
          {p.row.flags.filter((f) => f !== 'MANUAL' && f !== 'LATE' && f !== 'OUTSIDE_HOURS').map((f) => <SoftChip key={f} label={flagLabel(f)} />)}
        </Stack>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Daily attendance"
        subtitle={`${list.data?.meta.total ?? 0} employees on ${formatDate(date)}. Click a name to see their punches and fix a day.`}
        actions={<Button component={Link} href={`/exports?type=ATTENDANCE_DAILY&date=${date}`} variant="outlined" startIcon={<FileDownloadOutlinedIcon />}>Export</Button>}
      />
      <FilterBar>
        <TextField type="date" label="Date" value={date} onChange={(e) => reset(setDate)(e.target.value || todayIso())} slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: todayIso() } }} />
        <TextField label="Search name or code" value={q} onChange={(e) => reset(setQ)(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlinedIcon fontSize="small" /></InputAdornment> } }} />
        <TextField select label="Status" value={status} onChange={(e) => reset(setStatus)(e.target.value)}>
          <MenuItem value="">All statuses</MenuItem>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
        </TextField>
        <TextField select label="Late" value={late ? 'yes' : ''} onChange={(e) => reset(setLate)(e.target.value === 'yes')}>
          <MenuItem value="">Anyone</MenuItem>
          <MenuItem value="yes">Late only</MenuItem>
        </TextField>
        <NamedSelect label="Branch" value={branchId} onChange={reset(setBranchId)} options={branches.data} allLabel="All branches" />
        <NamedSelect label="Department" value={departmentId} onChange={reset(setDepartmentId)} options={departments.data} allLabel="All departments" />
        <NamedSelect label="Site" value={siteId} onChange={reset(setSiteId)} options={sites.data} allLabel="All sites" />
      </FilterBar>
      {list.error ? (
        <ErrorAlert error={list.error} onRetry={() => list.refetch()} />
      ) : (
        <DataTable
          rows={list.data?.items ?? []}
          columns={columns}
          getRowId={(r) => r.employee.id}
          loading={list.isLoading}
          total={list.data?.meta.total}
          page={page}
          pageSize={pageSize}
          onPageChange={(p, s) => { setPage(p); setPageSize(s); }}
          emptyText="No employees match these filters."
        />
      )}
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <DailyPage />
    </Suspense>
  );
}
