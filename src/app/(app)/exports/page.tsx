'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DownloadIcon from '@mui/icons-material/Download';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/common/data-table';
import { NamedSelect, useBranches } from '@/components/common/filters';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { formatDateTime, thisMonth, todayIso } from '@/lib/format';
import { api } from '@/lib/http';

const TYPES = [
  { value: 'ATTENDANCE_DAILY', label: 'Daily attendance', needs: 'date' },
  { value: 'ATTENDANCE_REGISTER', label: 'Monthly attendance register', needs: 'month' },
  { value: 'PUNCH_LOG', label: 'Punch log', needs: 'range' },
  { value: 'SALARY_REGISTER', label: 'Salary register', needs: 'month' },
  { value: 'LEAVE_REGISTER', label: 'Leave register', needs: 'month' },
  { value: 'EMPLOYEE_MASTER', label: 'Employee master', needs: 'none' },
] as const;

interface ExportJob {
  id: string;
  type: string;
  format: string;
  status: string;
  error: string | null;
  createdAt: string;
  ready: boolean;
}

function ExportsPage() {
  const search = useSearchParams();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [type, setType] = useState(search.get('type') ?? 'ATTENDANCE_DAILY');
  const [format, setFormat] = useState<'XLSX' | 'PDF'>('XLSX');
  const [date, setDate] = useState(search.get('date') ?? todayIso());
  const [month, setMonth] = useState(search.get('month') ?? thisMonth());
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [branchId, setBranchId] = useState('');
  const branches = useBranches();
  const jobs = useQuery({ queryKey: ['exports'], queryFn: () => api.get<ExportJob[]>('/exports'), refetchInterval: (q) => (q.state.data?.some((j) => j.status === 'QUEUED' || j.status === 'RUNNING') ? 2000 : false) });
  const request = useMutation({
    // The server generates the file before it responds, so the job comes back DONE or FAILED.
    mutationFn: () => api.post<{ id: string; status: string; error: string | null }>('/exports', { type, format, date, month, from, to, branchId: branchId || undefined }),
    onSuccess: (job) => { queryClient.invalidateQueries({ queryKey: ['exports'] }); if (job.status === 'FAILED') notify(job.error ?? 'Export failed', 'error'); else notify('Export ready; download it below'); },
    onError: notifyError,
  });
  const needs = TYPES.find((t) => t.value === type)?.needs ?? 'none';

  const columns: GridColDef<ExportJob>[] = [
    { field: 'type', headerName: 'Report', flex: 1, minWidth: 200, valueGetter: (_, r) => TYPES.find((t) => t.value === r.type)?.label ?? r.type },
    { field: 'format', headerName: 'Format', width: 90 },
    { field: 'createdAt', headerName: 'Requested', width: 170, valueGetter: (_, r) => formatDateTime(r.createdAt) },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <Chip size="small" label={p.value} color={p.value === 'DONE' ? 'success' : p.value === 'FAILED' ? 'error' : 'default'} variant="outlined" /> },
    { field: 'error', headerName: 'Problem', flex: 1, minWidth: 160 },
    { field: 'actions', headerName: '', width: 140, sortable: false, renderCell: (p) => (p.row.ready ? <Button size="small" startIcon={<DownloadIcon />} href={`/api/t/exports/${p.row.id}/download`}>Download</Button> : null) },
  ];

  return (
    <>
      <PageHeader title="Exports" subtitle="Excel and PDF reports are kept for 7 days." />
      <Card sx={{ mb: 2 }}><CardContent>
        <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField select label="Report" value={type} onChange={(e) => setType(e.target.value)} sx={{ minWidth: 240 }}>
            {TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </TextField>
          <TextField select label="Format" value={format} onChange={(e) => setFormat(e.target.value as 'XLSX' | 'PDF')} sx={{ minWidth: 120 }}><MenuItem value="XLSX">Excel</MenuItem><MenuItem value="PDF">PDF</MenuItem></TextField>
          {needs === 'date' && <TextField type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />}
          {needs === 'month' && <TextField type="month" label="Month" value={month} onChange={(e) => setMonth(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />}
          {needs === 'range' && <><TextField type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /><TextField type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></>}
          <NamedSelect label="Branch" value={branchId} onChange={setBranchId} options={branches.data} />
          <Button variant="contained" onClick={() => request.mutate()} disabled={request.isPending}>Generate</Button>
        </Stack>
        {type === 'ATTENDANCE_REGISTER' && format === 'PDF' && <Typography variant="caption" color="text.secondary">The PDF register carries monthly totals only; use Excel for the day-by-day grid.</Typography>}
      </CardContent></Card>
      <DataTable rows={jobs.data ?? []} columns={columns} loading={jobs.isLoading} height={440} />
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ExportsPage />
    </Suspense>
  );
}
