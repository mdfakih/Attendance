'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import type { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { formatDateTime } from '@/lib/format';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

interface Binding {
  id: string;
  status: 'PENDING' | 'ACTIVE';
  employee: { id: string; fullName: string; employeeCode: string | null; phoneE164: string };
  manufacturer: string;
  model: string;
  osVersion: string;
  appVersion: string;
  createdAt: string;
  activatedAt: string | null;
  lastSeenAt: string | null;
  hasActivationSelfie: boolean;
  samePhoneAsBefore: boolean;
}

export default function DevicesPage() {
  const { can, has } = useSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'PENDING' | 'ACTIVE'>(has('DEVICE_APPROVAL') ? 'PENDING' : 'ACTIVE');
  const [selfie, setSelfie] = useState<string | null>(null);
  const [reject, setReject] = useState<Binding | null>(null);
  const list = useQuery({ queryKey: ['devices', tab], queryFn: () => api.get<Binding[]>('/devices', { status: tab }) });
  const done = () => { queryClient.invalidateQueries({ queryKey: ['devices'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); };
  const approve = useMutation({ mutationFn: (id: string) => api.post(`/devices/${id}/approve`), onSuccess: () => { done(); notify('Device approved'); }, onError: notifyError });
  const rejectMut = useMutation({ mutationFn: ({ id, note }: { id: string; note: string }) => api.post(`/devices/${id}/reject`, { note }), onSuccess: () => { done(); setReject(null); notify('Device rejected'); }, onError: notifyError });
  const viewSelfie = async (id: string) => {
    try {
      const { url } = await api.get<{ url: string }>(`/devices/${id}/activation-selfie`);
      setSelfie(url);
    } catch (e) {
      notifyError(e);
    }
  };

  const columns: GridColDef<Binding>[] = [
    { field: 'employee', headerName: 'Employee', flex: 1, minWidth: 200, renderCell: (p) => <Link href={`/employees/${p.row.employee.id}`}>{p.row.employee.fullName}</Link> },
    { field: 'phone', headerName: 'Mobile', width: 140, valueGetter: (_, r) => r.employee.phoneE164 },
    { field: 'model', headerName: 'Phone', width: 200, valueGetter: (_, r) => `${r.manufacturer} ${r.model}`.trim() },
    { field: 'osVersion', headerName: 'Android', width: 90 },
    { field: 'appVersion', headerName: 'App', width: 90 },
    { field: 'createdAt', headerName: tab === 'PENDING' ? 'Requested' : 'Activated', width: 170, valueGetter: (_, r) => formatDateTime(tab === 'PENDING' ? r.createdAt : r.activatedAt) },
    { field: 'lastSeenAt', headerName: 'Last seen', width: 170, valueGetter: (_, r) => formatDateTime(r.lastSeenAt) },
    { field: 'samePhoneAsBefore', headerName: 'Note', width: 150, renderCell: (p) => (p.value ? <Chip size="small" label="Same phone as before" color="info" variant="outlined" /> : null) },
    {
      field: 'actions', headerName: '', width: 260, sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={1}>
          {p.row.hasActivationSelfie && <Button size="small" onClick={() => viewSelfie(p.row.id)}>Selfie</Button>}
          {tab === 'PENDING' && can('DEVICES', 'edit') && (
            <>
              <Button size="small" variant="contained" onClick={() => approve.mutate(p.row.id)} disabled={approve.isPending}>Approve</Button>
              <Button size="small" color="error" onClick={() => setReject(p.row)}>Reject</Button>
            </>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Devices" subtitle="Each employee can use one registered phone. Release a phone from the employee page to let them switch." />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        {has('DEVICE_APPROVAL') && <Tab value="PENDING" label="Awaiting approval" />}
        <Tab value="ACTIVE" label="Registered phones" />
      </Tabs>
      <DataTable rows={list.data ?? []} columns={columns} loading={list.isLoading} />
      <Dialog open={!!selfie} onClose={() => setSelfie(null)} maxWidth="sm">
        <DialogContent>{selfie && <img src={selfie} alt="Activation selfie" style={{ maxWidth: '100%', borderRadius: 8 }} />}</DialogContent>
      </Dialog>
      <ConfirmDialog open={!!reject} title="Reject this phone?" message={`${reject?.employee.fullName} will need a new activation code to try again.`} confirmLabel="Reject" destructive reasonLabel="Reason" busy={rejectMut.isPending} onClose={() => setReject(null)} onConfirm={(note) => reject && rejectMut.mutate({ id: reject.id, note })} />
    </>
  );
}
