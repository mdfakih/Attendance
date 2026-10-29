'use client';

import { useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import PhoneAndroidOutlinedIcon from '@mui/icons-material/PhoneAndroidOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EMPLOYEE_STATUS } from '@/components/admin/status';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { ErrorAlert, Loading } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { SoftChip } from '@/components/common/status-chip';
import { ActivationCodeDialog, type IssuedCode } from '@/components/employees/activation-code-dialog';
import { SalaryHistoryCard } from '@/components/employees/salary-history-card';
import { EmployeeAttendanceTab } from '@/components/employees/tabs/attendance-tab';
import { EmployeeDevicesTab } from '@/components/employees/tabs/devices-tab';
import { EmployeeLeaveTab } from '@/components/employees/tabs/leave-tab';
import { EmployeePayTab } from '@/components/employees/tabs/pay-tab';
import { initials } from '@/lib/brand';
import { formatDate } from '@/lib/format';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';
import { tint } from '@/lib/tone';

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

type TabKey = 'attendance' | 'pay' | 'leave' | 'devices';

function InfoCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card sx={{ height: '100%', p: 2.25 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25, color: 'text.secondary' }}>
        <Box sx={{ display: 'flex', '& svg': { fontSize: 18 } }}>{icon}</Box>
        <Typography variant="overline" sx={{ lineHeight: 1 }}>{title}</Typography>
      </Stack>
      {children}
    </Card>
  );
}

export default function EmployeePage() {
  const { id } = useParams<{ id: string }>();
  const { can, has } = useSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('attendance');
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
    onSuccess: (d) => { invalidate(); setIssued(d.activationCode); notify('Employee reactivated'); },
    onError: notifyError,
  });

  if (employee.isLoading) {
    return (
      <Stack spacing={2.5}>
        <Loading minHeight={80} />
        <Loading minHeight={320} />
      </Stack>
    );
  }
  if (employee.error || !employee.data) return <ErrorAlert error={employee.error ?? new Error('Employee not found')} onRetry={() => employee.refetch()} />;
  const e = employee.data;
  const live = e.status === 'ACTIVE' || e.status === 'INVITED';
  const status = EMPLOYEE_STATUS[e.status] ?? { label: e.status, tone: 'default' as const };
  const activeDevice = e.devices.find((d) => d.status === 'ACTIVE');
  const pendingDevice = e.devices.find((d) => d.status === 'PENDING');
  const showPay = has('PAY_MONITORING') && can('PAY');
  const showSalary = !showPay && can('EMPLOYEE_SALARY');
  const showLeave = has('LEAVE') && can('LEAVE');
  const showDevices = can('DEVICES');
  const visible: TabKey[] = ['attendance', ...(showPay || showSalary ? ['pay' as const] : []), ...(showLeave ? ['leave' as const] : []), ...(showDevices ? ['devices' as const] : [])];
  const current = visible.includes(tab) ? tab : 'attendance';

  return (
    <>
      <PageHeader
        title={e.fullName}
        breadcrumbs={[{ label: 'Employees', href: '/employees' }, { label: e.fullName }]}
        leading={
          <Avatar sx={(t) => ({ width: 56, height: 56, fontSize: 20, color: 'primary.main', bgcolor: tint(t, 'primary', 0.12), display: { xs: 'none', sm: 'flex' } })}>
            {initials(e.fullName)}
          </Avatar>
        }
        subtitle={
          <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <SoftChip label={status.label} tone={status.tone} dot />
            <span>{[e.employeeCode, e.designation, e.branch.name, e.department?.name].filter(Boolean).join(' · ')}</span>
          </Stack>
        }
        actions={
          <>
            {live && can('EMPLOYEES', 'delete') && <Button color="warning" variant="outlined" onClick={() => setConfirm('deactivate')}>Deactivate</Button>}
            {live && can('EMPLOYEES', 'delete') && <Button color="error" variant="outlined" onClick={() => setConfirm('exit')}>Mark exited</Button>}
            {e.status === 'DEACTIVATED' && can('EMPLOYEES', 'edit') && <Button variant="contained" onClick={() => reactivate.mutate()} loading={reactivate.isPending}>Reactivate</Button>}
          </>
        }
      />
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <InfoCard icon={<BadgeOutlinedIcon />} title="Contact">
            <Typography sx={{ fontWeight: 600 }}>{e.phone}</Typography>
            <Typography variant="body2" color="text.secondary">{e.email ?? 'No email'}</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>Joined {formatDate(e.dateOfJoining)}{e.exitDate ? ` · Left ${formatDate(e.exitDate)}` : ''}</Typography>
          </InfoCard>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <InfoCard icon={<PlaceOutlinedIcon />} title="Where they work">
            <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', mb: 1 }}>
              {e.sites.length === 0 ? <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600 }}>No work site — punching is blocked</Typography> : e.sites.map((s) => <SoftChip key={s.id} label={s.name} tone="primary" />)}
            </Stack>
            <Typography variant="body2">Shift: <strong>{e.shifts[0]?.shift.name ?? 'Branch default'}</strong></Typography>
          </InfoCard>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <InfoCard icon={<PhoneAndroidOutlinedIcon />} title="Phone">
            {activeDevice ? (
              <>
                <Typography sx={{ fontWeight: 600 }}>{`${activeDevice.manufacturer} ${activeDevice.model}`.trim()}</Typography>
                <SoftChip label="Registered" tone="success" dot />
              </>
            ) : pendingDevice ? (
              <SoftChip label="Awaiting approval" tone="warning" dot />
            ) : (
              <>
                <Typography variant="body2" color="text.secondary">Not registered yet</Typography>
                {e.activationCode && <Typography variant="body2" sx={{ mt: 0.5 }}>Activation code {e.activationCode.expired ? 'expired' : `valid till ${formatDate(e.activationCode.expiresAt)}`}</Typography>}
              </>
            )}
          </InfoCard>
        </Grid>
      </Grid>
      <Tabs value={current} onChange={(_, v: TabKey) => setTab(v)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="attendance" label="Attendance" />
        {(showPay || showSalary) && <Tab value="pay" label={showPay ? 'Pay' : 'Salary'} />}
        {showLeave && <Tab value="leave" label="Leave" />}
        {showDevices && <Tab value="devices" label="Phone & codes" />}
      </Tabs>
      {current === 'attendance' && <EmployeeAttendanceTab employeeId={id} />}
      {current === 'pay' && showPay && <EmployeePayTab employee={e} onChanged={invalidate} />}
      {current === 'pay' && showSalary && <Box sx={{ maxWidth: 640 }}><SalaryHistoryCard employee={e} onChanged={invalidate} /></Box>}
      {current === 'leave' && <EmployeeLeaveTab employeeId={id} />}
      {current === 'devices' && <EmployeeDevicesTab employee={e} onChanged={invalidate} />}
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
