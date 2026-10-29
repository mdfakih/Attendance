'use client';

import { useState, type ReactNode } from 'react';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ForwardToInboxOutlinedIcon from '@mui/icons-material/ForwardToInboxOutlined';
import MailOutlineIcon from '@mui/icons-material/MailOutlineOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { EmptyState } from '@/components/common/loading';
import { SectionCard } from '@/components/common/section-card';
import { StatCard } from '@/components/common/stat-card';
import { SoftChip } from '@/components/common/status-chip';
import { useSnackbar } from '@/components/common/snackbar';
import { initials } from '@/lib/brand';
import { formatDate, formatDateTime } from '@/lib/format';
import { consoleApi } from '@/lib/http';
import { useConsoleSession } from './console-session';
import { EditClientDialog } from './edit-client-dialog';
import { INDIAN_STATES, type TenantDetail } from './types';

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
      <Typography variant="body2" component="div" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>{children}</Typography>
    </Box>
  );
}

export function ClientOverviewTab({ tenant }: { tenant: TenantDetail }) {
  const { canManage } = useConsoleSession();
  const { notify, notifyError } = useSnackbar();
  const [editing, setEditing] = useState(false);
  const resend = useMutation({
    mutationFn: (email: string) => consoleApi.post(`/tenants/${tenant.id}/resend-invite`, { email }),
    onSuccess: (_, email) => notify(`Invitation re-sent to ${email}`),
    onError: notifyError,
  });
  const cap = tenant.employeeCap;
  const seats = tenant.employees.active + tenant.employees.invited;
  const usedPct = cap ? Math.min(100, (seats / cap) * 100) : 0;
  const state = INDIAN_STATES.find((s) => s.code === tenant.stateCode)?.name ?? tenant.stateCode;

  return (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, sm: 4 }}>
        <StatCard
          label="Active employees"
          value={tenant.employees.active.toLocaleString('en-IN')}
          icon={<BadgeOutlinedIcon />}
          caption={
            cap ? (
              <Box>
                {seats.toLocaleString('en-IN')} of {cap.toLocaleString('en-IN')} seats used
                <LinearProgress variant="determinate" value={usedPct} color={usedPct >= 90 ? 'warning' : 'primary'} sx={{ height: 5, mt: 0.75 }} />
              </Box>
            ) : 'No employee limit'
          }
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <StatCard label="Invited, not yet active" value={tenant.employees.invited.toLocaleString('en-IN')} icon={<PersonAddAltOutlinedIcon />} tone="info" caption="Waiting to activate the app" />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <StatCard label="Admins" value={tenant.admins.length} icon={<ManageAccountsOutlinedIcon />} tone="secondary" caption={tenant.pendingInvites.length ? `${tenant.pendingInvites.length} invitation pending` : 'All invitations accepted'} />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <SectionCard
          title="Company details"
          action={canManage && <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => setEditing(true)}>Edit</Button>}
        >
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}><Detail label="Company name">{tenant.displayName}</Detail></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><Detail label="Legal name">{tenant.legalName}</Detail></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><Detail label="Short ID">{tenant.slug}</Detail></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><Detail label="State">{state}</Detail></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><Detail label="GSTIN">{tenant.gstin ?? '—'}</Detail></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><Detail label="Billing email">{tenant.billingEmail}</Detail></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><Detail label="Time zone">{tenant.timezone}</Detail></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><Detail label="Pay features">{tenant.payrollTier === 'BASIC' ? 'Basic pay monitoring' : 'Full payroll'}</Detail></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><Detail label="Client since">{formatDate(tenant.createdAt)}</Detail></Grid>
          </Grid>
        </SectionCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <SectionCard title="Admin accounts" subtitle="People with full access to this client’s dashboard">
          {tenant.admins.length === 0 && tenant.pendingInvites.length === 0 ? (
            <EmptyState compact icon={<ManageAccountsOutlinedIcon />} title="No admins yet" />
          ) : (
            <Stack divider={<Divider flexItem />}>
              {tenant.admins.map((a) => (
                <Stack key={a.email} direction="row" spacing={1.5} sx={{ py: 1.25, alignItems: 'center' }}>
                  <Avatar sx={{ width: 36, height: 36, fontSize: 13, bgcolor: 'primary.main', color: 'primary.contrastText' }}>{initials(a.fullName)}</Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{a.fullName}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap component="div">{a.email}</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
                    {a.lastLoginAt ? <>Last sign-in<br />{formatDateTime(a.lastLoginAt)}</> : 'Never signed in'}
                  </Typography>
                </Stack>
              ))}
              {tenant.pendingInvites.map((i) => (
                <Stack key={i.id} direction="row" spacing={1.5} sx={{ py: 1.25, alignItems: 'center' }}>
                  <Avatar sx={{ width: 36, height: 36, bgcolor: 'action.hover', color: 'text.secondary' }}><MailOutlineIcon fontSize="small" /></Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{i.fullName}</Typography>
                      <SoftChip label="Invited" tone="info" />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" noWrap component="div">{i.email} · expires {formatDate(i.expiresAt)}</Typography>
                  </Box>
                  {canManage && (
                    <Button size="small" startIcon={<ForwardToInboxOutlinedIcon />} loading={resend.isPending && resend.variables === i.email} onClick={() => resend.mutate(i.email)}>
                      Resend
                    </Button>
                  )}
                </Stack>
              ))}
            </Stack>
          )}
        </SectionCard>
      </Grid>
      {editing && <EditClientDialog tenant={tenant} open={editing} onClose={() => setEditing(false)} />}
    </Grid>
  );
}
