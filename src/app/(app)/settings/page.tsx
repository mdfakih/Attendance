'use client';

import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import type { FeatureKey } from '@attendance/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BrandingCard, CompanyCard, SubscriptionCard, type Billing } from '@/components/admin/settings/company-cards';
import { FeatureList, type FeatureRow } from '@/components/admin/settings/feature-list';
import { SettingsForm, type CompanySettings } from '@/components/admin/settings/settings-form';
import { ErrorAlert, Loading } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { SectionCard } from '@/components/common/section-card';
import { useSnackbar } from '@/components/common/snackbar';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

export default function SettingsPage() {
  const { isAdmin, session, refresh } = useSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.get<CompanySettings>('/settings') });
  const features = useQuery({ queryKey: ['features'], queryFn: () => api.get<FeatureRow[]>('/features'), enabled: isAdmin });
  const billing = useQuery({ queryKey: ['billing'], queryFn: () => api.get<Billing>('/billing'), enabled: isAdmin });
  const toggle = useMutation({
    mutationFn: (f: { key: FeatureKey; enabled: boolean }) => api.put<FeatureRow[]>('/features', f),
    onSuccess: (rows, v) => {
      queryClient.setQueryData(['features'], rows);
      refresh();
      const label = rows.find((r) => r.key === v.key)?.label ?? 'Feature';
      notify(`${label} turned ${v.enabled ? 'on' : 'off'}`);
    },
    onError: notifyError,
  });
  const all = features.data ?? [];
  // Older servers send no category: treat their features as options.
  const modules = all.filter((f) => f.category === 'MODULE');
  const options = all.filter((f) => f.category !== 'MODULE');
  const pendingKey = toggle.isPending ? (toggle.variables?.key ?? null) : null;
  const onToggle = (key: FeatureKey, enabled: boolean) => toggle.mutate({ key, enabled });

  return (
    <>
      <PageHeader title="Settings" subtitle={`Company-wide settings for ${session.tenant.displayName}.`} />
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 7 }}>
          {settings.error ? (
            <ErrorAlert error={settings.error} onRetry={() => settings.refetch()} />
          ) : settings.data ? (
            <SettingsForm key={settings.dataUpdatedAt} initial={settings.data} />
          ) : (
            <SectionCard title="Attendance & location"><Loading minHeight={260} /></SectionCard>
          )}
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={2.5}>
            <CompanyCard />
            <BrandingCard />
            {isAdmin && <SubscriptionCard billing={billing.data} loading={billing.isLoading} />}
          </Stack>
        </Grid>
        {isAdmin && (
          <>
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionCard title="Modules" subtitle="Switch whole areas of the dashboard and app on or off." icon={<ToggleOnOutlinedIcon />}>
                {features.isLoading ? <Loading minHeight={200} /> : features.error ? <ErrorAlert error={features.error} onRetry={() => features.refetch()} /> : (
                  <FeatureList features={modules} all={all} editable={isAdmin} pendingKey={pendingKey} onToggle={onToggle} />
                )}
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SectionCard title="Options" subtitle="Fine-tune how the modules you use behave." icon={<TuneOutlinedIcon />}>
                {features.isLoading ? <Loading minHeight={120} /> : features.error ? <ErrorAlert error={features.error} /> : (
                  <FeatureList features={options} all={all} editable={isAdmin} pendingKey={pendingKey} onToggle={onToggle} />
                )}
              </SectionCard>
            </Grid>
          </>
        )}
      </Grid>
    </>
  );
}
