'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/common/data-table';
import { NamedSelect, useBranches, useDepartments, useSites } from '@/components/common/filters';
import { PageHeader } from '@/components/common/page-header';
import { StatusChip } from '@/components/common/status-chip';
import { formatMinutes, formatOutside, formatTime, REG_STATE_COLOR, STATUS_LABEL, todayIso } from '@/lib/format';
import { api } from '@/lib/http';

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

  const columns: GridColDef<DailyRow>[] = [
    { field: 'code', headerName: 'Code', width: 90, valueGetter: (_, r) => r.employee.employeeCode ?? '' },
    { field: 'name', headerName: 'Employee', flex: 1, minWidth: 180, valueGetter: (_, r) => r.employee.fullName, renderCell: (p) => <Link href={`/employees/${p.row.employee.id}`}>{p.row.employee.fullName}</Link> },
    { field: 'branch', headerName: 'Branch', width: 140, valueGetter: (_, r) => r.employee.branch?.name ?? '' },
    { field: 'status', headerName: 'Status', width: 140, renderCell: (p) => <StatusChip status={p.row.status} /> },
    { field: 'firstPunchAt', headerName: 'In', width: 80, valueGetter: (_, r) => formatTime(r.firstPunchAt) },
    { field: 'lastPunchAt', headerName: 'Last', width: 80, valueGetter: (_, r) => (r.punchCount > 1 ? formatTime(r.lastPunchAt) : '—') },
    { field: 'workedMinutes', headerName: 'Hours', width: 90, valueGetter: (_, r) => formatMinutes(r.workedMinutes) },
    { field: 'lateMinutes', headerName: 'Late', width: 80, valueGetter: (_, r) => (r.isLate ? `${r.lateMinutes} min` : '') },
    { field: 'flags', headerName: 'Flags', flex: 1, minWidth: 160, renderCell: (p) => <Stack direction="row" spacing={0.5}>{p.row.statusSource === 'MANUAL' && <Chip size="small" label="manual" color="info" variant="outlined" />}{p.row.outsideMinutes > 0 && <Chip size="small" label={formatOutside(p.row.outsideMinutes, p.row.regState)} color={REG_STATE_COLOR[p.row.regState] ?? 'default'} variant="outlined" />}{p.row.flags.filter((f) => f !== 'MANUAL' && f !== 'LATE').map((f) => <Chip key={f} size="small" label={f.replace(/_/g, ' ').toLowerCase()} variant="outlined" />)}</Stack> },
  ];

  return (
    <>
      <PageHeader title="Daily attendance" subtitle={`${list.data?.meta.total ?? 0} employees`} actions={<Button component={Link} href={`/exports?type=ATTENDANCE_DAILY&date=${date}`} variant="outlined">Export</Button>} />
      <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', mb: 2 }}>
        <TextField type="date" label="Date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 170 }} />
        <TextField label="Search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} sx={{ minWidth: 200 }} />
        <TextField select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} sx={{ minWidth: 160 }}>
          <MenuItem value="">All</MenuItem>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
        </TextField>
        <TextField select label="Late" value={late ? 'yes' : ''} onChange={(e) => setLate(e.target.value === 'yes')} sx={{ minWidth: 120 }}><MenuItem value="">Any</MenuItem><MenuItem value="yes">Late only</MenuItem></TextField>
        <NamedSelect label="Branch" value={branchId} onChange={setBranchId} options={branches.data} />
        <NamedSelect label="Department" value={departmentId} onChange={setDepartmentId} options={departments.data} />
        <NamedSelect label="Site" value={siteId} onChange={setSiteId} options={sites.data} />
      </Stack>
      <DataTable rows={list.data?.items ?? []} columns={columns} getRowId={(r) => r.employee.id} loading={list.isLoading} total={list.data?.meta.total} page={page} pageSize={pageSize} onPageChange={(p, s) => { setPage(p); setPageSize(s); }} />
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
