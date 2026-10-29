'use client';

import { useState } from 'react';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import FaceOutlinedIcon from '@mui/icons-material/FaceOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PersonCell } from '@/components/admin/person-cell';
import { StatusTabs } from '@/components/admin/status-tabs';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { SoftChip } from '@/components/common/status-chip';
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
  const [selfie, setSelfie] = useState<{ url: string; name: string } | null>(null);
  const [loadingSelfie, setLoadingSelfie] = useState<string | null>(null);
  const [reject, setReject] = useState<Binding | null>(null);
  const list = useQuery({ queryKey: ['devices', tab], queryFn: () => api.get<Binding[]>('/devices', { status: tab }) });
  const done = () => { queryClient.invalidateQueries({ queryKey: ['devices'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); };
  const approve = useMutation({ mutationFn: (id: string) => api.post(`/devices/${id}/approve`), onSuccess: () => { done(); notify('Phone approved'); }, onError: notifyError });
  const rejectMut = useMutation({ mutationFn: ({ id, note }: { id: string; note: string }) => api.post(`/devices/${id}/reject`, { note }), onSuccess: () => { done(); setReject(null); notify('Phone rejected'); }, onError: notifyError });
  const viewSelfie = async (b: Binding) => {
    setLoadingSelfie(b.id);
    try {
      const { url } = await api.get<{ url: string }>(`/devices/${b.id}/activation-selfie`);
      setSelfie({ url, name: b.employee.fullName });
    } catch (e) {
      notifyError(e);
    } finally {
      setLoadingSelfie(null);
    }
  };

  const columns: GridColDef<Binding>[] = [
    { field: 'employee', headerName: 'Employee', flex: 1, minWidth: 220, valueGetter: (_, r) => r.employee.fullName, renderCell: (p) => <PersonCell name={p.row.employee.fullName} href={`/employees/${p.row.employee.id}`} caption={p.row.employee.phoneE164} /> },
    { field: 'model', headerName: 'Phone', width: 210, renderCell: (p) => <Stack><Typography variant="body2" sx={{ fontWeight: 600 }}>{`${p.row.manufacturer} ${p.row.model}`.trim()}</Typography><Typography variant="caption" color="text.secondary">Android {p.row.osVersion} · app {p.row.appVersion}</Typography></Stack> },
    { field: 'createdAt', headerName: tab === 'PENDING' ? 'Requested' : 'Activated', width: 170, valueGetter: (_, r) => formatDateTime(tab === 'PENDING' ? r.createdAt : r.activatedAt) },
    { field: 'lastSeenAt', headerName: 'Last seen', width: 170, valueGetter: (_, r) => formatDateTime(r.lastSeenAt) },
    { field: 'samePhoneAsBefore', headerName: 'Note', width: 170, renderCell: (p) => (p.value ? <SoftChip label="Same phone as before" tone="info" /> : null) },
    {
      field: 'actions', headerName: '', width: 270, sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={1}>
          {p.row.hasActivationSelfie && <Button size="small" startIcon={<FaceOutlinedIcon />} loading={loadingSelfie === p.row.id} onClick={() => viewSelfie(p.row)}>Selfie</Button>}
          {tab === 'PENDING' && can('DEVICES', 'edit') && (
            <>
              <Button size="small" variant="contained" loading={approve.isPending && approve.variables === p.row.id} disabled={approve.isPending} onClick={() => approve.mutate(p.row.id)}>Approve</Button>
              <Button size="small" color="error" onClick={() => setReject(p.row)}>Reject</Button>
            </>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Devices" subtitle="Each employee uses one registered phone. To move someone to a new phone, release the old one from their employee page." />
      <StatusTabs
        value={tab}
        onChange={(v) => setTab(v as 'PENDING' | 'ACTIVE')}
        options={[...(has('DEVICE_APPROVAL') ? [{ value: 'PENDING', label: 'Awaiting approval' }] : []), { value: 'ACTIVE', label: 'Registered phones' }]}
      />
      <DataTable
        rows={list.data ?? []}
        columns={columns}
        loading={list.isLoading}
        rowHeight={56}
        emptyText={tab === 'PENDING' ? 'No phones waiting for approval.' : 'No phones registered yet. Share activation codes from the Employees page.'}
      />
      <Dialog open={!!selfie} onClose={() => setSelfie(null)} maxWidth="sm">
        <DialogTitle sx={{ pr: 7 }}>
          Activation selfie{selfie ? ` · ${selfie.name}` : ''}
          <IconButton aria-label="Close" onClick={() => setSelfie(null)} sx={{ position: 'absolute', right: 12, top: 12 }}><CloseOutlinedIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          {selfie && <Box component="img" src={selfie.url} alt={`Activation selfie of ${selfie.name}`} sx={{ maxWidth: '100%', borderRadius: 3, display: 'block' }} />}
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!reject} title="Reject this phone?" message={`${reject?.employee.fullName ?? 'The employee'} will need a new activation code to try again.`} confirmLabel="Reject" destructive reasonLabel="Reason" busy={rejectMut.isPending} onClose={() => setReject(null)} onConfirm={(note) => reject && rejectMut.mutate({ id: reject.id, note })} />
    </>
  );
}
