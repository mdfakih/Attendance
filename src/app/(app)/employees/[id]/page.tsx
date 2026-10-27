'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { ErrorAlert, Loading } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { ActivationCodeDialog, type IssuedCode } from '@/components/employees/activation-code-dialog';
import { EmployeeAttendanceTab } from '@/components/employees/tabs/attendance-tab';
import { EmployeeDevicesTab } from '@/components/employees/tabs/devices-tab';
import { EmployeeLeaveTab } from '@/components/employees/tabs/leave-tab';
import { EmployeePayTab } from '@/components/employees/tabs/pay-tab';
import { formatDate } from '@/lib/format';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

export interface EmployeeDetail {
  id: string;
  employeeCode: string | null;
  fullName: string;
  phone: string;
  email: string | null;
  designation: string | null;
  status: string;
  branch: { id: string; name: string };
  department: { id: string; name: string } | null;
  dateOfJoining: string;
  exitDate: string | null;
  exitReason: string | null;
  sites: Array<{ id: string; name: string }>;
  shifts: Array<{ id: string; shift: { name: string }; effectiveFrom: string; effectiveTo: string | null }>;
  devices: Array<{ id: string; status: string; manufacturer: string; model: string; osVersion: string; appVersion: string; activatedAt: string | null; lastSeenAt: string | null; revokedAt: string | null; revokeReason: string | null }>;
  activationCode: { purpose: string; expiresAt: string; expired: boolean } | null;
  salaryHistory: Array<{ id: string; basis: string; amount: string; effectiveFrom: string; effectiveTo: string | null; otMultiplier: string | null; reason: string }> | null;
}

const TABS = ['attendance', 'pay', 'leave', 'devices'] as const;

export default function EmployeePage() {
  const { id } = useParams<{ id: string }>();
  const { can, has } = useSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>('attendance');
  const [confirm, setConfirm] = useState<'deactivate' | 'exit' | null>(null);
  const [issued, setIssued] = useState<IssuedCode | null>(null);
  const employee = useQuery({ queryKey: ['employee', id], queryFn: () => api.get<EmployeeDetail>(`/employees/${id}`) });
  const invalidate = () => { queryClient.invalidateQueries({ queryKey: ['employee', id] }); queryClient.invalidateQueries({ queryKey: ['employees'] }); };
  const deactivate = useMutation({
    mutationFn: ({ reason, exited }: { reason: string; exited: boolean }) => api.post(`/employees/${id}/deactivate`, { reason, exited }),
    onSuccess: () => { invalidate(); setConfirm(null); notify('Employee updated'); },
    onError: notifyError,
  });
  const reactivate = useMutation({
    mutationFn: () => api.post<{ activationCode: IssuedCode }>(`/employees/${id}/reactivate`),
    onSuccess: (d) => { invalidate(); setIssued(d.activationCode); },
    onError: notifyError,
  });

  if (employee.isLoading) return <Loading />;
  if (employee.error || !employee.data) return <ErrorAlert error={employee.error ?? new Error('Not found')} />;
  const e = employee.data;
  const live = e.status === 'ACTIVE' || e.status === 'INVITED';

  return (
    <>
      <PageHeader
        title={e.fullName}
        subtitle={[e.employeeCode, e.designation, e.branch.name, e.department?.name].filter(Boolean).join(' · ')}
        actions={
          <>
            <Chip label={e.status} color={live ? 'success' : 'default'} variant="outlined" />
            {live && can('EMPLOYEES', 'delete') && <Button color="warning" onClick={() => setConfirm('deactivate')}>Deactivate</Button>}
            {live && can('EMPLOYEES', 'delete') && <Button color="error" onClick={() => setConfirm('exit')}>Mark exited</Button>}
            {e.status === 'DEACTIVATED' && can('EMPLOYEES', 'edit') && <Button variant="contained" onClick={() => reactivate.mutate()} disabled={reactivate.isPending}>Reactivate</Button>}
          </>
        }
      />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card><CardContent>
            <Typography variant="overline" color="text.secondary">Contact</Typography>
            <Typography>{e.phone}</Typography>
            <Typography color="text.secondary">{e.email ?? 'No email'}</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>Joined {formatDate(e.dateOfJoining)}{e.exitDate ? ` · Exit ${formatDate(e.exitDate)}` : ''}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card><CardContent>
            <Typography variant="overline" color="text.secondary">Work sites</Typography>
            <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {e.sites.length === 0 ? <Typography color="text.secondary">None assigned — punching will be blocked</Typography> : e.sites.map((s) => <Chip key={s.id} label={s.name} size="small" />)}
            </Stack>
            <Typography variant="body2" sx={{ mt: 1 }}>Shift: {e.shifts[0]?.shift.name ?? 'Branch default'}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card><CardContent>
            <Typography variant="overline" color="text.secondary">Phone</Typography>
            {e.devices.find((d) => d.status === 'ACTIVE') ? (
              <Typography>{`${e.devices.find((d) => d.status === 'ACTIVE')?.manufacturer} ${e.devices.find((d) => d.status === 'ACTIVE')?.model}`} · registered</Typography>
            ) : e.devices.find((d) => d.status === 'PENDING') ? (
              <Typography color="warning.main">Awaiting approval</Typography>
            ) : (
              <Typography color="text.secondary">Not registered{e.activationCode ? ` · code ${e.activationCode.expired ? 'expired' : 'issued'}` : ''}</Typography>
            )}
          </CardContent></Card>
        </Grid>
      </Grid>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="attendance" label="Attendance" />
        {can('PAY') && <Tab value="pay" label="Pay" />}
        {has('LEAVE') && can('LEAVE') && <Tab value="leave" label="Leave" />}
        {can('DEVICES') && <Tab value="devices" label="Phone & codes" />}
      </Tabs>
      {tab === 'attendance' && <EmployeeAttendanceTab employeeId={id} />}
      {tab === 'pay' && <EmployeePayTab employee={e} onChanged={invalidate} />}
      {tab === 'leave' && <EmployeeLeaveTab employeeId={id} />}
      {tab === 'devices' && <EmployeeDevicesTab employee={e} onChanged={invalidate} />}
      <ConfirmDialog
        open={!!confirm}
        title={confirm === 'exit' ? 'Mark as exited?' : 'Deactivate employee?'}
        message={confirm === 'exit' ? 'The employee leaves the company: their phone is released, codes cancelled and the mobile number freed. Attendance history is kept.' : 'The employee is paused: their phone is released and they cannot punch until reactivated.'}
        confirmLabel={confirm === 'exit' ? 'Mark exited' : 'Deactivate'}
        destructive
        reasonLabel="Reason"
        busy={deactivate.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={(reason) => deactivate.mutate({ reason, exited: confirm === 'exit' })}
      />
      <ActivationCodeDialog open={!!issued} employeeName={e.fullName} phone={e.phone} code={issued} onClose={() => setIssued(null)} />
    </>
  );
}
