'use client';

import { useState } from 'react';
import Link from 'next/link';
import AddIcon from '@mui/icons-material/Add';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/common/data-table';
import { FormDialog } from '@/components/common/form-dialog';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { formatDate } from '@/lib/format';
import { consoleApi } from '@/lib/http';

interface TenantRow {
  id: string;
  slug: string;
  displayName: string;
  legalName: string;
  status: string;
  payrollTier: string;
  employeeCap: number | null;
  employees: number;
  plan: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
}

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = { ACTIVE: 'success', TRIAL: 'info', PAST_DUE: 'warning', SUSPENDED: 'error', CANCELLED: 'default' };
const STATES = ['AN', 'AP', 'AR', 'AS', 'BR', 'CH', 'CT', 'DL', 'DN', 'GA', 'GJ', 'HP', 'HR', 'JH', 'JK', 'KA', 'KL', 'LA', 'LD', 'MH', 'ML', 'MN', 'MP', 'MZ', 'NL', 'OR', 'PB', 'PY', 'RJ', 'SK', 'TG', 'TN', 'TR', 'UP', 'UT', 'WB'];

const emptyForm = { legalName: '', displayName: '', slug: '', gstin: '', stateCode: 'MH', billingEmail: '', planId: '', trialDays: 14, employeeCap: '', payrollTier: 'BASIC', admin: { fullName: '', email: '' } };

export default function TenantsPage() {
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [form, setForm] = useState<typeof emptyForm | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const params = { q: q || undefined, status: status || undefined, page, pageSize };
  const list = useQuery({ queryKey: ['console-tenants', params], queryFn: () => consoleApi.getPaged<TenantRow>('/tenants', params) });
  const plans = useQuery({ queryKey: ['console-plans'], queryFn: () => consoleApi.get<Array<{ id: string; name: string; active: boolean; trialDays: number }>>('/plans') });
  const create = useMutation({
    mutationFn: (f: typeof emptyForm) => consoleApi.post<{ tenantId: string; inviteLink: string }>('/tenants', { ...f, gstin: f.gstin || undefined, employeeCap: f.employeeCap ? Number(f.employeeCap) : undefined }),
    onSuccess: (d) => { queryClient.invalidateQueries({ queryKey: ['console-tenants'] }); setForm(null); setInviteLink(d.inviteLink); notify('Client onboarded'); },
    onError: notifyError,
  });
  const columns: GridColDef<TenantRow>[] = [
    { field: 'displayName', headerName: 'Client', flex: 1, minWidth: 200, renderCell: (p) => <Link href={`/console/tenants/${p.row.id}`}>{p.value}</Link> },
    { field: 'slug', headerName: 'Slug', width: 140 },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <Chip size="small" label={p.value} color={STATUS_COLOR[p.value as string]} variant="outlined" /> },
    { field: 'plan', headerName: 'Plan', width: 120 },
    { field: 'payrollTier', headerName: 'Pay tier', width: 100 },
    { field: 'employees', headerName: 'Employees', width: 110, valueGetter: (_, r) => `${r.employees}${r.employeeCap ? ` / ${r.employeeCap}` : ''}` },
    { field: 'currentPeriodEnd', headerName: 'Period ends', width: 130, valueGetter: (_, r) => formatDate(r.currentPeriodEnd) },
    { field: 'createdAt', headerName: 'Since', width: 130, valueGetter: (_, r) => formatDate(r.createdAt) },
  ];
  return (
    <>
      <PageHeader title="Clients" subtitle={`${list.data?.meta.total ?? 0} companies`} actions={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setForm({ ...emptyForm, planId: plans.data?.find((p) => p.active)?.id ?? '' })}>Onboard client</Button>} />
      {inviteLink && <Alert severity="success" onClose={() => setInviteLink(null)} sx={{ mb: 2, wordBreak: 'break-all' }}>Invitation emailed to the admin. Backup link: {inviteLink}</Alert>}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField label="Search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} sx={{ minWidth: 240 }} />
        <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 150 }}><MenuItem value="">All</MenuItem>{Object.keys(STATUS_COLOR).map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField>
      </Stack>
      <DataTable rows={list.data?.items ?? []} columns={columns} loading={list.isLoading} total={list.data?.meta.total} page={page} pageSize={pageSize} onPageChange={(p, s) => { setPage(p); setPageSize(s); }} />
      <FormDialog open={!!form} title="Onboard a client" submitLabel="Create & invite admin" busy={create.isPending} onClose={() => setForm(null)} onSubmit={() => form && create.mutate(form)}>
        {form && (<>
          <Stack direction="row" spacing={1}>
            <TextField label="Company display name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value, slug: form.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })} autoFocus />
            <TextField label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} helperText="lowercase, 3–40 chars" />
          </Stack>
          <TextField label="Legal name" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
          <Stack direction="row" spacing={1}>
            <TextField label="GSTIN (optional)" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} />
            <TextField select label="State" value={form.stateCode} onChange={(e) => setForm({ ...form, stateCode: e.target.value })} sx={{ minWidth: 110 }}>{STATES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField>
          </Stack>
          <TextField label="Billing email" type="email" value={form.billingEmail} onChange={(e) => setForm({ ...form, billingEmail: e.target.value })} />
          <Stack direction="row" spacing={1}>
            <TextField select label="Plan" value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })}>{plans.data?.filter((p) => p.active).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}</TextField>
            <TextField select label="Pay tier" value={form.payrollTier} onChange={(e) => setForm({ ...form, payrollTier: e.target.value })}><MenuItem value="BASIC">Basic pay monitoring</MenuItem><MenuItem value="FULL" disabled>Full payroll (coming later)</MenuItem></TextField>
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField type="number" label="Trial days" value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: Number(e.target.value) })} />
            <TextField type="number" label="Employee cap (optional)" value={form.employeeCap} onChange={(e) => setForm({ ...form, employeeCap: e.target.value })} />
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField label="First admin name" value={form.admin.fullName} onChange={(e) => setForm({ ...form, admin: { ...form.admin, fullName: e.target.value } })} />
            <TextField label="First admin email" type="email" value={form.admin.email} onChange={(e) => setForm({ ...form, admin: { ...form.admin, email: e.target.value } })} />
          </Stack>
        </>)}
      </FormDialog>
    </>
  );
}
