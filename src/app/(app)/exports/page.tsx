'use client';

import { Suspense, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import TodayOutlinedIcon from '@mui/icons-material/TodayOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EXPORT_STATUS } from '@/components/admin/status';
import { DataTable } from '@/components/common/data-table';
import { FeatureGate } from '@/components/common/feature-gate';
import { NamedSelect, useBranches } from '@/components/common/filters';
import { PageHeader } from '@/components/common/page-header';
import { SectionCard } from '@/components/common/section-card';
import { useSnackbar } from '@/components/common/snackbar';
import { SoftChip } from '@/components/common/status-chip';
import { formatDateTime, thisMonth, todayIso } from '@/lib/format';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';
import { tint } from '@/lib/tone';

interface ReportType {
  readonly value: string;
  readonly label: string;
  readonly description: string;
  readonly needs: 'date' | 'month' | 'range' | 'none';
  readonly icon: ReactNode;
}

const TYPES: readonly ReportType[] = [
  { value: 'ATTENDANCE_DAILY', label: 'Daily attendance', description: 'Everyone’s status and hours for one day', needs: 'date', icon: <TodayOutlinedIcon /> },
  { value: 'ATTENDANCE_REGISTER', label: 'Monthly register', description: 'Day-by-day grid with monthly totals', needs: 'month', icon: <CalendarMonthOutlinedIcon /> },
  { value: 'PUNCH_LOG', label: 'Punch log', description: 'Every punch with time, site and distance', needs: 'range', icon: <FingerprintIcon /> },
  { value: 'SALARY_REGISTER', label: 'Salary register', description: 'Earned pay for the month', needs: 'month', icon: <PaymentsOutlinedIcon /> },
  { value: 'LEAVE_REGISTER', label: 'Leave register', description: 'Leave taken and balances', needs: 'month', icon: <EventBusyOutlinedIcon /> },
  { value: 'EMPLOYEE_MASTER', label: 'Employee master', description: 'All employees and their details', needs: 'none', icon: <BadgeOutlinedIcon /> },
];

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
  const { has } = useSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const available = TYPES.filter((t) => (t.value !== 'SALARY_REGISTER' || has('PAY_MONITORING')) && (t.value !== 'LEAVE_REGISTER' || has('LEAVE')));
  const requested = search.get('type');
  const [type, setType] = useState(available.some((t) => t.value === requested) ? (requested as string) : available[0].value);
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
    onSuccess: (job) => { queryClient.invalidateQueries({ queryKey: ['exports'] }); if (job.status === 'FAILED') notify(job.error ?? 'Export failed', 'error'); else notify('Export ready — download it below'); },
    onError: notifyError,
  });
  const needs = TYPES.find((t) => t.value === type)?.needs ?? 'none';

  const columns: GridColDef<ExportJob>[] = [
    { field: 'type', headerName: 'Report', flex: 1, minWidth: 200, valueGetter: (_, r) => TYPES.find((t) => t.value === r.type)?.label ?? r.type },
    { field: 'format', headerName: 'Format', width: 100, valueGetter: (_, r) => (r.format === 'XLSX' ? 'Excel' : r.format) },
    { field: 'createdAt', headerName: 'Requested', width: 180, valueGetter: (_, r) => formatDateTime(r.createdAt) },
    { field: 'status', headerName: 'Status', width: 130, renderCell: (p) => { const s = EXPORT_STATUS[p.row.status] ?? { label: p.row.status, tone: 'default' as const }; return <SoftChip label={s.label} tone={s.tone} dot />; } },
    { field: 'error', headerName: 'Problem', flex: 1, minWidth: 160 },
    { field: 'actions', headerName: '', width: 150, sortable: false, renderCell: (p) => (p.row.ready ? <Button size="small" variant="outlined" startIcon={<FileDownloadOutlinedIcon />} href={`/api/t/exports/${p.row.id}/download`}>Download</Button> : null) },
  ];

  return (
    <>
      <PageHeader title="Exports" subtitle="Pick a report, choose the period, and download it as Excel or PDF. Files are kept for 7 days." />
      <Stack spacing={2.5}>
        <SectionCard title="1. Choose a report">
          <Grid container spacing={1.5}>
            {available.map((t) => {
              const selected = t.value === type;
              return (
                <Grid key={t.value} size={{ xs: 12, sm: 6, lg: 4 }}>
                  <ButtonBase
                    onClick={() => setType(t.value)}
                    aria-pressed={selected}
                    sx={(th) => ({
                      width: '100%', textAlign: 'left', justifyContent: 'flex-start', gap: 1.5, p: 1.75, borderRadius: 3, border: 1.5,
                      borderColor: selected ? 'primary.main' : 'divider',
                      bgcolor: selected ? tint(th, 'primary', 0.06) : 'transparent',
                      '&:hover': { borderColor: 'primary.main' },
                    })}
                  >
                    <Box sx={(th) => ({ width: 40, height: 40, borderRadius: 2.5, display: 'grid', placeItems: 'center', flexShrink: 0, color: 'primary.main', bgcolor: tint(th, 'primary', 0.12) })}>{t.icon}</Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }}>{t.label}</Typography>
                      <Typography variant="body2" color="text.secondary">{t.description}</Typography>
                    </Box>
                  </ButtonBase>
                </Grid>
              );
            })}
          </Grid>
        </SectionCard>
        <SectionCard title="2. Choose the period and format">
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(190px, 1fr))' }, alignItems: 'start' }}>
            {needs === 'date' && <TextField type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />}
            {needs === 'month' && <TextField type="month" label="Month" value={month} onChange={(e) => setMonth(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />}
            {needs === 'range' && (
              <>
                <TextField type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              </>
            )}
            <NamedSelect label="Branch" value={branchId} onChange={setBranchId} options={branches.data} allLabel="All branches" />
            <TextField select label="Format" value={format} onChange={(e) => setFormat(e.target.value as 'XLSX' | 'PDF')}>
              <MenuItem value="XLSX">Excel (.xlsx)</MenuItem>
              <MenuItem value="PDF">PDF</MenuItem>
            </TextField>
          </Box>
          {type === 'ATTENDANCE_REGISTER' && format === 'PDF' && (
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5 }}>The PDF register carries monthly totals only; use Excel for the day-by-day grid.</Typography>
          )}
          <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 2 }}>
            <Button variant="contained" size="large" startIcon={<FileDownloadOutlinedIcon />} onClick={() => request.mutate()} loading={request.isPending} loadingPosition="start">
              Generate report
            </Button>
          </Stack>
        </SectionCard>
        <Box>
          <Typography variant="overline" color="text.secondary" component="h2" sx={{ display: 'block', mb: 1 }}>Recent exports</Typography>
          <DataTable rows={jobs.data ?? []} columns={columns} loading={jobs.isLoading} height={440} emptyText="No exports yet. Generate your first report above." />
        </Box>
      </Stack>
    </>
  );
}

export default function Page() {
  return (
    <FeatureGate feature="EXPORTS">
      <Suspense>
        <ExportsPage />
      </Suspense>
    </FeatureGate>
  );
}
