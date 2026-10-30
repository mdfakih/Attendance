'use client';

import type { ReactNode } from 'react';
import { FEATURE_REGISTRY, type FeatureKey, type FeatureView } from '@attendance/contracts';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import MoreTimeOutlinedIcon from '@mui/icons-material/MoreTimeOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import PhonelinkLockOutlinedIcon from '@mui/icons-material/PhonelinkLockOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ErrorAlert, Loading } from '@/components/common/loading';
import { SectionCard } from '@/components/common/section-card';
import { useSnackbar } from '@/components/common/snackbar';
import { tint } from '@/lib/tone';
import { clientFeaturesKey, saveClientFeature, useClientFeatures } from './client-features';
import { useConsoleSession } from './console-session';

const META: Readonly<Record<FeatureKey, { icon: ReactNode; where: ReadonlyArray<'Web' | 'App'> }>> = {
  LEAVE: { icon: <EventBusyOutlinedIcon />, where: ['Web', 'App'] },
  OVERTIME: { icon: <TimerOutlinedIcon />, where: ['Web'] },
  EXTRA_TIME: { icon: <MoreTimeOutlinedIcon />, where: ['Web', 'App'] },
  LIVE_MAP: { icon: <MapOutlinedIcon />, where: ['Web'] },
  PAY_MONITORING: { icon: <PaymentsOutlinedIcon />, where: ['Web'] },
  EXPORTS: { icon: <FileDownloadOutlinedIcon />, where: ['Web'] },
  BULK_IMPORT: { icon: <UploadFileOutlinedIcon />, where: ['Web'] },
  DEVICE_APPROVAL: { icon: <PhonelinkLockOutlinedIcon />, where: ['Web', 'App'] },
  AUTO_EMAIL_ACTIVATION_CODES: { icon: <MarkEmailReadOutlinedIcon />, where: ['Web'] },
  EMPLOYEE_EARNINGS_VIEW: { icon: <AccountBalanceWalletOutlinedIcon />, where: ['App'] },
};

interface RowProps {
  readonly feature: FeatureView;
  readonly all: readonly FeatureView[];
  readonly busy: boolean;
  readonly disabled: boolean;
  readonly onToggle: (enabled: boolean) => void;
  readonly onLock: (locked: boolean) => void;
}

function ModuleRow({ feature, all, busy, disabled, onToggle, onLock }: RowProps) {
  const missing = feature.requires.filter((key) => !all.find((f) => f.key === key)?.enabled);
  const blocked = missing.length > 0;
  const meta = META[feature.key];
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ py: 2, alignItems: { sm: 'center' } }}>
      <Stack direction="row" spacing={1.75} sx={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
        <Box
          sx={(t) => ({
            width: 40, height: 40, flexShrink: 0, borderRadius: 2.5, display: 'grid', placeItems: 'center',
            color: feature.enabled ? 'primary.main' : 'text.disabled',
            bgcolor: feature.enabled ? tint(t, 'primary', 0.1) : 'action.hover',
            '& svg': { fontSize: 21 },
          })}
        >
          {meta.icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 700 }}>{feature.label}</Typography>
            {meta.where.map((w) => (
              <Chip key={w} label={w === 'App' ? 'Employee app' : 'Dashboard'} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6875rem', color: 'text.secondary' }} />
            ))}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{feature.description}</Typography>
          {blocked && (
            <Typography variant="caption" color="warning.main" sx={{ fontWeight: 600, display: 'block', mt: 0.5 }}>
              Needs {missing.map((k) => FEATURE_REGISTRY[k].label).join(', ')} to be on first.
            </Typography>
          )}
        </Box>
      </Stack>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'flex-end', pl: { xs: 7, sm: 0 } }}>
        <Tooltip title={feature.locked ? 'Locked: the client’s admin can’t change this. Click to unlock.' : 'Unlocked: the client’s admin can switch this. Click to lock.'}>
          <span>
            <Chip
              icon={feature.locked ? <LockOutlinedIcon /> : <LockOpenOutlinedIcon />}
              label={feature.locked ? 'Locked' : 'Client can change'}
              size="small"
              color={feature.locked ? 'warning' : 'default'}
              variant={feature.locked ? 'filled' : 'outlined'}
              disabled={disabled || busy}
              onClick={() => onLock(!feature.locked)}
              sx={{ fontWeight: 600, minWidth: 92 }}
            />
          </span>
        </Tooltip>
        <Box sx={{ width: 58, display: 'flex', justifyContent: 'center' }}>
          {busy ? (
            <CircularProgress size={22} aria-label={`Saving ${feature.label}`} />
          ) : (
            <Switch
              checked={feature.enabled}
              disabled={disabled || (blocked && !feature.enabled)}
              onChange={(e) => onToggle(e.target.checked)}
              slotProps={{ input: { 'aria-label': `${feature.label} ${feature.enabled ? 'on' : 'off'}` } }}
            />
          )}
        </Box>
      </Stack>
    </Stack>
  );
}

interface ClientModulesTabProps {
  readonly tenantId: string;
  readonly tenantName: string;
}

export function ClientModulesTab({ tenantId, tenantName }: ClientModulesTabProps) {
  const { canManage } = useConsoleSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const features = useClientFeatures(tenantId);
  const save = useMutation({
    // Sends only what changed, so locking never rewrites the stored on/off value.
    mutationFn: (input: { key: FeatureKey; enabled?: boolean; locked?: boolean }) => saveClientFeature(tenantId, input),
    onSuccess: (data, input) => {
      queryClient.setQueryData(clientFeaturesKey(tenantId), data);
      const label = FEATURE_REGISTRY[input.key].label;
      if (input.locked !== undefined) notify(`${label} ${input.locked ? 'locked' : 'unlocked'} for ${tenantName}`);
      else notify(`${label} turned ${input.enabled ? 'on' : 'off'} for ${tenantName}`);
    },
    onError: notifyError,
  });

  if (features.isLoading) return <SectionCard><Loading minHeight={260} /></SectionCard>;
  if (features.error || !features.data) return <ErrorAlert error={features.error ?? new Error('Could not load modules')} onRetry={() => features.refetch()} />;

  const all = features.data;
  const modules = all.filter((f) => f.category === 'MODULE');
  const options = all.filter((f) => f.category === 'OPTION');
  const on = modules.filter((f) => f.enabled).length;
  const locked = all.filter((f) => f.locked).length;
  const renderList = (list: readonly FeatureView[]) =>
    list.map((f, i) => (
      <Box key={f.key}>
        {i > 0 && <Divider />}
        <ModuleRow
          feature={f}
          all={all}
          busy={save.isPending && save.variables?.key === f.key}
          disabled={!canManage || (save.isPending && save.variables?.key !== f.key)}
          onToggle={(enabled) => save.mutate({ key: f.key, enabled })}
          onLock={(locked) => save.mutate({ key: f.key, locked })}
        />
      </Box>
    ));

  return (
    <Stack spacing={2.5}>
      <Alert severity="info" variant="outlined">
        Switch parts of the product on or off for <strong>{tenantName}</strong>. Changes take effect straight away; anyone who already has the dashboard or app open sees them the next time they come back to it.
        Lock a module to stop their own admin from changing it.
        {!canManage && ' You have view-only access.'}
      </Alert>
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12 }}>
          <SectionCard title="Modules" subtitle={`${on} of ${modules.length} switched on · ${locked} locked`}>
            {renderList(modules)}
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <SectionCard title="Options" subtitle="Fine-tune how the switched-on modules behave">
            {renderList(options)}
          </SectionCard>
        </Grid>
      </Grid>
    </Stack>
  );
}
