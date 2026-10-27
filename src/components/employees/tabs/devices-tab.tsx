'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useSnackbar } from '@/components/common/snackbar';
import { ActivationCodeDialog, type IssuedCode } from '@/components/employees/activation-code-dialog';
import type { EmployeeDetail } from '@/app/(app)/employees/[id]/page';
import { formatDateTime } from '@/lib/format';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

export function EmployeeDevicesTab({ employee, onChanged }: { employee: EmployeeDetail; onChanged: () => void }) {
  const { can } = useSession();
  const { notify, notifyError } = useSnackbar();
  const [code, setCode] = useState<IssuedCode | null | 'none'>(null);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const bound = employee.devices.some((d) => d.status === 'ACTIVE' || d.status === 'PENDING');
  const live = employee.status === 'ACTIVE' || employee.status === 'INVITED';

  const reveal = useMutation({ mutationFn: (purpose: string) => api.get<{ code: IssuedCode | null }>(`/employees/${employee.id}/activation-code`, { purpose }), onSuccess: (d) => setCode(d.code ?? 'none'), onError: notifyError });
  const regenerate = useMutation({ mutationFn: (purpose: string) => api.post<IssuedCode>(`/employees/${employee.id}/activation-code`, { purpose }), onSuccess: (d) => { setCode(d); onChanged(); }, onError: notifyError });
  const email = useMutation({ mutationFn: () => api.post(`/employees/${employee.id}/activation-code/email`), onSuccess: () => notify('Code emailed'), onError: notifyError });
  const release = useMutation({ mutationFn: (reason: string) => api.post<{ activationCode: IssuedCode }>(`/employees/${employee.id}/release-device`, { reason }), onSuccess: (d) => { setReleaseOpen(false); setCode(d.activationCode); onChanged(); notify('Phone released'); }, onError: notifyError });

  return (
    <Stack spacing={2}>
      <Card><CardContent>
        <Typography variant="h6" gutterBottom>Activation</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The employee signs in to the app with their mobile number and a one-time code. One phone per employee; to move to a new phone, release the current one — that issues a fresh code automatically.
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {!bound && live && can('DEVICES', 'view') && <Button variant="outlined" onClick={() => reveal.mutate('ACTIVATION')}>Show current code</Button>}
          {!bound && live && can('DEVICES', 'create') && <Button variant="contained" onClick={() => regenerate.mutate('ACTIVATION')}>New activation code</Button>}
          {!bound && live && employee.email && can('DEVICES', 'create') && <Button onClick={() => email.mutate()}>Email code</Button>}
          {bound && live && can('DEVICES', 'create') && <Button variant="outlined" onClick={() => regenerate.mutate('PIN_RESET')}>PIN reset code</Button>}
          {bound && live && can('DEVICES', 'edit') && <Button color="warning" variant="outlined" onClick={() => setReleaseOpen(true)}>Release phone</Button>}
        </Stack>
      </CardContent></Card>
      <Card><CardContent>
        <Typography variant="h6" gutterBottom>Phone history</Typography>
        {employee.devices.length === 0 ? <Typography color="text.secondary" variant="body2">No phone has been registered yet.</Typography> : (
          <Table size="small">
            <TableHead><TableRow><TableCell>Phone</TableCell><TableCell>Status</TableCell><TableCell>Activated</TableCell><TableCell>Last seen</TableCell><TableCell>Released</TableCell></TableRow></TableHead>
            <TableBody>
              {employee.devices.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{`${d.manufacturer} ${d.model}`.trim()} <Typography component="span" variant="caption" color="text.secondary">Android {d.osVersion} · app {d.appVersion}</Typography></TableCell>
                  <TableCell><Chip size="small" label={d.status} color={d.status === 'ACTIVE' ? 'success' : d.status === 'PENDING' ? 'warning' : 'default'} variant="outlined" /></TableCell>
                  <TableCell>{formatDateTime(d.activatedAt)}</TableCell>
                  <TableCell>{formatDateTime(d.lastSeenAt)}</TableCell>
                  <TableCell>{d.revokedAt ? `${formatDateTime(d.revokedAt)} · ${d.revokeReason?.replace(/_/g, ' ').toLowerCase()}` : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
      <ActivationCodeDialog open={code !== null} employeeName={employee.fullName} phone={employee.phone} code={code === 'none' ? null : code} onClose={() => setCode(null)} />
      <ConfirmDialog open={releaseOpen} title="Release this phone?" message="The current phone is signed out immediately and a new activation code is issued for the employee's next phone." confirmLabel="Release" destructive reasonLabel="Reason" busy={release.isPending} onClose={() => setReleaseOpen(false)} onConfirm={(reason) => release.mutate(reason)} />
    </Stack>
  );
}
