'use client';

import { useState } from 'react';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import MailOutlineOutlinedIcon from '@mui/icons-material/MailOutlineOutlined';
import PhoneAndroidOutlinedIcon from '@mui/icons-material/PhoneAndroidOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import type { EmployeeDetail } from '@/app/(app)/employees/[id]/page';
import { DEVICE_STATUS, flagLabel } from '@/components/admin/status';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/loading';
import { SectionCard } from '@/components/common/section-card';
import { useSnackbar } from '@/components/common/snackbar';
import { SoftChip } from '@/components/common/status-chip';
import { ActivationCodeDialog, type IssuedCode } from '@/components/employees/activation-code-dialog';
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
  const regenerating = regenerate.isPending ? regenerate.variables : null;

  return (
    <Stack spacing={2.5}>
      <SectionCard
        title="Sign-in to the app"
        subtitle="The employee signs in with their mobile number and a one-time code. One phone per employee — to switch phones, release the current one and a fresh code is issued."
        icon={<VpnKeyOutlinedIcon />}
      >
        {!live ? (
          <Typography variant="body2" color="text.secondary">This employee is not active, so no codes can be issued.</Typography>
        ) : (
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {!bound && can('DEVICES', 'view') && <Button variant="outlined" loading={reveal.isPending} onClick={() => reveal.mutate('ACTIVATION')}>Show current code</Button>}
            {!bound && can('DEVICES', 'create') && <Button variant="contained" loading={regenerating === 'ACTIVATION'} disabled={!!regenerating} onClick={() => regenerate.mutate('ACTIVATION')}>New activation code</Button>}
            {!bound && employee.email && can('DEVICES', 'create') && <Button startIcon={<MailOutlineOutlinedIcon />} loading={email.isPending} onClick={() => email.mutate()}>Email code</Button>}
            {bound && can('DEVICES', 'create') && <Button variant="outlined" loading={regenerating === 'PIN_RESET'} disabled={!!regenerating} onClick={() => regenerate.mutate('PIN_RESET')}>PIN reset code</Button>}
            {bound && can('DEVICES', 'edit') && <Button color="warning" variant="outlined" startIcon={<PhoneAndroidOutlinedIcon />} onClick={() => setReleaseOpen(true)}>Release phone</Button>}
          </Stack>
        )}
      </SectionCard>
      <SectionCard title="Phone history" icon={<HistoryOutlinedIcon />} flush>
        {employee.devices.length === 0 ? (
          <EmptyState compact icon={<PhoneAndroidOutlinedIcon />} title="No phone registered yet" description="Share the activation code so the employee can sign in." />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TableCell sx={{ pl: 2.5 }}>Phone</TableCell><TableCell>Status</TableCell><TableCell>Activated</TableCell><TableCell>Last seen</TableCell><TableCell sx={{ pr: 2.5 }}>Released</TableCell></TableRow></TableHead>
              <TableBody>
                {employee.devices.map((d) => {
                  const s = DEVICE_STATUS[d.status] ?? { label: d.status, tone: 'default' as const };
                  return (
                    <TableRow key={d.id}>
                      <TableCell sx={{ pl: 2.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{`${d.manufacturer} ${d.model}`.trim()}</Typography>
                        <Typography variant="caption" color="text.secondary">Android {d.osVersion} · app {d.appVersion}</Typography>
                      </TableCell>
                      <TableCell><SoftChip label={s.label} tone={s.tone} dot /></TableCell>
                      <TableCell>{formatDateTime(d.activatedAt)}</TableCell>
                      <TableCell>{formatDateTime(d.lastSeenAt)}</TableCell>
                      <TableCell sx={{ pr: 2.5 }}>{d.revokedAt ? `${formatDateTime(d.revokedAt)}${d.revokeReason ? ` · ${flagLabel(d.revokeReason)}` : ''}` : '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>
      <ActivationCodeDialog open={code !== null} employeeName={employee.fullName} phone={employee.phone} code={code === 'none' ? null : code} onClose={() => setCode(null)} />
      <ConfirmDialog open={releaseOpen} title="Release this phone?" message="The current phone is signed out immediately and a new activation code is issued for the employee's next phone." confirmLabel="Release" destructive reasonLabel="Reason" busy={release.isPending} onClose={() => setReleaseOpen(false)} onConfirm={(reason) => release.mutate(reason)} />
    </Stack>
  );
}
