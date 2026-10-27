'use client';

import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/common/data-table';
import { FormDialog } from '@/components/common/form-dialog';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { formatInr } from '@/lib/format';
import { consoleApi } from '@/lib/http';

interface Plan {
  id: string;
  code: string;
  name: string;
  version: number;
  pricePerEmployee: string;
  minBillableEmployees: number;
  defaultEmployeeCap: number | null;
  trialDays: number;
  paymentTermsDays: number;
  active: boolean;
}

const empty = { code: '', name: '', pricePerEmployee: '', minBillableEmployees: 0, defaultEmployeeCap: '', trialDays: 14 };

export default function PlansPage() {
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<typeof empty | null>(null);
  const plans = useQuery({ queryKey: ['console-plans'], queryFn: () => consoleApi.get<Plan[]>('/plans') });
  const create = useMutation({ mutationFn: (f: typeof empty) => consoleApi.post('/plans', { ...f, defaultEmployeeCap: f.defaultEmployeeCap ? Number(f.defaultEmployeeCap) : null }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['console-plans'] }); setForm(null); notify('Plan created'); }, onError: notifyError });
  const toggle = useMutation({ mutationFn: (p: Plan) => consoleApi.patch(`/plans/${p.id}`, { active: !p.active }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['console-plans'] }), onError: notifyError });
  const columns: GridColDef<Plan>[] = [
    { field: 'code', headerName: 'Code', width: 130, valueGetter: (_, r) => `${r.code} v${r.version}` },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'pricePerEmployee', headerName: 'Per employee / month', width: 170, valueGetter: (_, r) => formatInr(r.pricePerEmployee) },
    { field: 'minBillableEmployees', headerName: 'Min. billable', width: 110 },
    { field: 'defaultEmployeeCap', headerName: 'Default cap', width: 110, valueGetter: (_, r) => r.defaultEmployeeCap ?? '—' },
    { field: 'trialDays', headerName: 'Trial days', width: 100 },
    { field: 'active', headerName: 'Active', width: 90, valueGetter: (_, r) => (r.active ? 'Yes' : 'No') },
    { field: 'actions', headerName: '', width: 120, sortable: false, renderCell: (p) => <Button size="small" onClick={() => toggle.mutate(p.row)}>{p.row.active ? 'Deactivate' : 'Activate'}</Button> },
  ];
  return (
    <>
      <PageHeader title="Plans" subtitle="Prices exclude GST. Changing a price creates a new version; existing clients keep theirs." actions={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setForm(empty)}>New plan</Button>} />
      <DataTable rows={plans.data ?? []} columns={columns} loading={plans.isLoading} height={420} />
      <FormDialog open={!!form} title="New plan / version" busy={create.isPending} onClose={() => setForm(null)} onSubmit={() => form && create.mutate(form)} maxWidth="xs">
        {form && (<>
          <Stack direction="row" spacing={1}>
            <TextField label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} helperText="Same code = new version" />
            <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Stack>
          <TextField label="Price per employee per month (₹)" value={form.pricePerEmployee} onChange={(e) => setForm({ ...form, pricePerEmployee: e.target.value })} />
          <Stack direction="row" spacing={1}>
            <TextField type="number" label="Minimum billable employees" value={form.minBillableEmployees} onChange={(e) => setForm({ ...form, minBillableEmployees: Number(e.target.value) })} />
            <TextField type="number" label="Default employee cap" value={form.defaultEmployeeCap} onChange={(e) => setForm({ ...form, defaultEmployeeCap: e.target.value })} />
          </Stack>
          <TextField type="number" label="Trial days" value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: Number(e.target.value) })} />
        </>)}
      </FormDialog>
    </>
  );
}
