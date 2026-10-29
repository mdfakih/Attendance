'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import AddBusinessOutlinedIcon from '@mui/icons-material/AddBusinessOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { TenantAvatar } from '@/components/brand/tenant-avatar';
import { DataTable } from '@/components/common/data-table';
import { ErrorAlert, TableSkeleton } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { SoftChip } from '@/components/common/status-chip';
import { useConsoleSession } from '@/components/console/console-session';
import { OnboardClientDialog } from '@/components/console/onboard-client-dialog';
import { TENANT_STATUS, type Overview, type TenantRow } from '@/components/console/types';
import { formatDate } from '@/lib/format';
import { consoleApi } from '@/lib/http';

const FILTERS = ['', 'ACTIVE', 'TRIAL', 'PAST_DUE', 'SUSPENDED', 'CANCELLED'] as const;

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

const columns: GridColDef<TenantRow>[] = [
  {
    field: 'displayName',
    headerName: 'Client',
    flex: 1.6,
    minWidth: 240,
    renderCell: (p) => (
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
        <TenantAvatar name={p.row.displayName} logoUrl={p.row.branding?.logoUrl} color={p.row.branding?.primaryColor} size={32} />
        <Box sx={{ minWidth: 0, lineHeight: 1.25 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{p.row.displayName}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">{p.row.legalName}</Typography>
        </Box>
      </Stack>
    ),
  },
  { field: 'status', headerName: 'Status', width: 130, renderCell: (p) => <SoftChip dot label={TENANT_STATUS[p.row.status]?.label ?? p.row.status} tone={TENANT_STATUS[p.row.status]?.tone ?? 'default'} /> },
  { field: 'plan', headerName: 'Plan', width: 140, valueGetter: (_, r) => r.plan ?? '—' },
  {
    field: 'employees',
    headerName: 'Employees',
    width: 170,
    renderCell: (p) => {
      const cap = p.row.employeeCap;
      const used = cap ? Math.min(100, (p.row.employees / cap) * 100) : 0;
      return (
        <Box sx={{ width: '100%' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.row.employees.toLocaleString('en-IN')}{cap ? <Typography component="span" variant="caption" color="text.secondary"> / {cap.toLocaleString('en-IN')}</Typography> : null}</Typography>
          {cap ? <LinearProgress variant="determinate" value={used} color={used >= 90 ? 'warning' : 'primary'} sx={{ height: 4, mt: 0.5 }} /> : null}
        </Box>
      );
    },
  },
  { field: 'currentPeriodEnd', headerName: 'Period ends', width: 130, valueGetter: (_, r) => formatDate(r.currentPeriodEnd) },
  { field: 'createdAt', headerName: 'Client since', width: 130, valueGetter: (_, r) => formatDate(r.createdAt) },
  { field: 'go', headerName: '', width: 48, sortable: false, disableColumnMenu: true, renderCell: () => <ChevronRightIcon sx={{ color: 'text.disabled' }} /> },
];

function TenantsList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { canManage } = useConsoleSession();
  const status = FILTERS.find((f) => f && f === params.get('status')) ?? '';
  const [q, setQ] = useState('');
  const search = useDebounced(q.trim(), 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [onboarding, setOnboarding] = useState(params.get('new') === '1');
  const query = { q: search || undefined, status: status || undefined, page, pageSize };
  const list = useQuery({ queryKey: ['console-tenants', query], queryFn: () => consoleApi.getPaged<TenantRow>('/tenants', query), placeholderData: (prev) => prev });
  const overview = useQuery({ queryKey: ['console-overview'], queryFn: () => consoleApi.get<Overview>('/overview') });
  const counts = overview.data?.tenantsByStatus;
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : undefined;

  const setStatus = (next: string) => {
    setPage(1);
    router.replace(next ? `${pathname}?status=${next}` : pathname, { scroll: false });
  };

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Every company using the platform. Open one to manage its modules, branding and billing."
        actions={canManage && <Button variant="contained" startIcon={<AddBusinessOutlinedIcon />} onClick={() => setOnboarding(true)}>Onboard client</Button>}
      />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2, alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {FILTERS.map((f) => {
            const count = f ? counts?.[f] ?? 0 : total;
            const selected = status === f;
            return (
              <Chip
                key={f || 'all'}
                label={`${f ? TENANT_STATUS[f].label : 'All'}${count !== undefined ? ` · ${count}` : ''}`}
                onClick={() => setStatus(f)}
                color={selected ? 'primary' : 'default'}
                variant={selected ? 'filled' : 'outlined'}
                sx={{ fontWeight: 600 }}
              />
            );
          })}
        </Stack>
        <TextField
          placeholder="Search by name or ID"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          sx={{ maxWidth: { md: 320 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          aria-label="Search clients"
        />
      </Stack>
      {list.error && <Box sx={{ mb: 2 }}><ErrorAlert error={list.error} onRetry={() => list.refetch()} /></Box>}
      {list.isLoading ? (
        <TableSkeleton rows={6} />
      ) : (
        <DataTable
          rows={list.data?.items ?? []}
          columns={columns}
          loading={list.isFetching}
          total={list.data?.meta.total ?? 0}
          page={page}
          pageSize={pageSize}
          onPageChange={(p, s) => { setPage(p); setPageSize(s); }}
          rowHeight={60}
          onRowClick={(p) => router.push(`/console/tenants/${p.row.id}`)}
          emptyText={search || status ? 'No clients match these filters.' : 'No clients yet. Onboard your first one.'}
          sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
          height={640}
        />
      )}
      <OnboardClientDialog open={onboarding} onClose={() => setOnboarding(false)} />
    </>
  );
}

export default function TenantsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} />}>
      <TenantsList />
    </Suspense>
  );
}
