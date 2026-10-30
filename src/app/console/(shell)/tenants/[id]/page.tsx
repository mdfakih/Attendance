'use client';

import { Suspense, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { DEFAULT_BRANDING } from '@attendance/contracts';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TenantAvatar } from '@/components/brand/tenant-avatar';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { ErrorAlert, PageSkeleton } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { SoftChip } from '@/components/common/status-chip';
import { useSnackbar } from '@/components/common/snackbar';
import { ClientBillingTab } from '@/components/console/client-billing-tab';
import { ClientBrandingTab } from '@/components/console/client-branding-tab';
import { ClientModulesTab } from '@/components/console/client-modules-tab';
import { ClientOverviewTab } from '@/components/console/client-overview-tab';
import { ClientRolesTab } from '@/components/console/client-roles-tab';
import { useConsoleSession } from '@/components/console/console-session';
import { TENANT_STATUS, type TenantDetail } from '@/components/console/types';
import { consoleApi } from '@/lib/http';

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'modules', label: 'Modules' },
  { value: 'roles', label: 'Roles & permissions' },
  { value: 'branding', label: 'Branding' },
  { value: 'billing', label: 'Billing' },
] as const;
type TabValue = (typeof TABS)[number]['value'];

function TenantDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab: TabValue = TABS.find((t) => t.value === params.get('tab'))?.value ?? 'overview';
  const { canBill } = useConsoleSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<'suspend' | 'reactivate' | null>(null);
  const tenant = useQuery({ queryKey: ['console-tenant', id], queryFn: () => consoleApi.get<TenantDetail>(`/tenants/${id}`) });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['console-tenant', id] });
    void queryClient.invalidateQueries({ queryKey: ['console-tenants'] });
    void queryClient.invalidateQueries({ queryKey: ['console-overview'] });
  };
  const setStatus = useMutation({
    mutationFn: ({ action, reason }: { action: 'suspend' | 'reactivate'; reason: string }) => consoleApi.post(`/tenants/${id}/${action}`, { reason }),
    onSuccess: (_, v) => { refresh(); setConfirm(null); notify(v.action === 'suspend' ? 'Client suspended' : 'Client reactivated'); },
    onError: notifyError,
  });

  if (tenant.isLoading) return <PageSkeleton />;
  if (tenant.error || !tenant.data) {
    return <ErrorAlert error={tenant.error ?? new Error('Client not found')} onRetry={() => tenant.refetch()} />;
  }
  const t = tenant.data;
  const branding = t.branding ?? DEFAULT_BRANDING;
  const status = TENANT_STATUS[t.status] ?? { label: t.status, tone: 'default' as const, help: '' };
  const canSuspend = t.status !== 'SUSPENDED' && t.status !== 'CANCELLED';
  const canReactivate = t.status === 'SUSPENDED' || t.status === 'PAST_DUE';
  const selectTab = (value: TabValue) => router.replace(value === 'overview' ? pathname : `${pathname}?tab=${value}`, { scroll: false });

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Clients', href: '/console/tenants' }, { label: t.displayName }]}
        leading={<TenantAvatar name={t.displayName} logoUrl={branding.logoUrl} color={branding.primaryColor} size={56} />}
        title={t.displayName}
        subtitle={
          <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <SoftChip dot label={status.label} tone={status.tone} />
            <span>{t.legalName}</span>
            <Box component="span" sx={{ color: 'text.disabled' }}>·</Box>
            <span>{t.slug}</span>
          </Stack>
        }
        actions={
          canBill && (
            <>
              {canReactivate && <Button variant="contained" color="success" startIcon={<RestartAltOutlinedIcon />} onClick={() => setConfirm('reactivate')}>Reactivate</Button>}
              {canSuspend && <Button variant="outlined" color="error" startIcon={<BlockOutlinedIcon />} onClick={() => setConfirm('suspend')}>Suspend</Button>}
            </>
          )
        }
      />
      {t.statusReason && (t.status === 'SUSPENDED' || t.status === 'PAST_DUE' || t.status === 'CANCELLED') && (
        <Alert severity={t.status === 'SUSPENDED' ? 'error' : 'warning'} sx={{ mb: 2.5 }}>
          {status.help} Reason: {t.statusReason}
        </Alert>
      )}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v: TabValue) => selectTab(v)} variant="scrollable" allowScrollButtonsMobile aria-label="Client sections">
          {TABS.map((x) => <Tab key={x.value} value={x.value} label={x.label} />)}
        </Tabs>
      </Box>
      {tab === 'overview' && <ClientOverviewTab tenant={t} />}
      {tab === 'modules' && <ClientModulesTab tenantId={t.id} tenantName={t.displayName} />}
      {tab === 'roles' && <ClientRolesTab tenantId={t.id} tenantName={t.displayName} />}
      {tab === 'branding' && <ClientBrandingTab key={t.id} tenantId={t.id} tenantName={t.displayName} branding={branding} />}
      {tab === 'billing' && <ClientBillingTab tenant={t} onChanged={refresh} />}

      <ConfirmDialog
        open={!!confirm}
        title={confirm === 'suspend' ? `Suspend ${t.displayName}?` : `Reactivate ${t.displayName}?`}
        message={confirm === 'suspend' ? 'Their dashboard becomes read-only and employees can’t punch until you reactivate them.' : 'Restores full access to their dashboard and employee app.'}
        confirmLabel={confirm === 'suspend' ? 'Suspend client' : 'Reactivate'}
        destructive={confirm === 'suspend'}
        reasonLabel="Reason"
        busy={setStatus.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={(reason) => confirm && setStatus.mutate({ action: confirm, reason })}
      />
    </>
  );
}

export default function TenantDetailPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TenantDetailView />
    </Suspense>
  );
}
