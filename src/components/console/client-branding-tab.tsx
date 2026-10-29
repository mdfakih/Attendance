'use client';

import { useState } from 'react';
import { brandingSchema, DEFAULT_BRANDING, type Branding } from '@attendance/contracts';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SectionCard } from '@/components/common/section-card';
import { useSnackbar } from '@/components/common/snackbar';
import { sameBranding } from '@/lib/branding-context';
import { consoleApi } from '@/lib/http';
import { BrandingEditor, type BrandingErrors } from './branding-editor';
import { BrandPreview } from './brand-preview';
import { useConsoleSession } from './console-session';

interface ClientBrandingTabProps {
  readonly tenantId: string;
  readonly tenantName: string;
  readonly branding: Branding;
}

export function ClientBrandingTab({ tenantId, tenantName, branding }: ClientBrandingTabProps) {
  const { canManage } = useConsoleSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Branding>(branding);
  const [errors, setErrors] = useState<BrandingErrors>({});
  const dirty = !sameBranding(draft, branding);
  const save = useMutation({
    mutationFn: (body: Branding) => consoleApi.put<Branding>(`/tenants/${tenantId}/branding`, body),
    onSuccess: (saved) => {
      setDraft(saved);
      void queryClient.invalidateQueries({ queryKey: ['console-tenant', tenantId] });
      void queryClient.invalidateQueries({ queryKey: ['console-tenants'] });
      notify(`Branding saved for ${tenantName}`);
    },
    onError: notifyError,
  });
  const submit = () => {
    const parsed = brandingSchema.safeParse(draft);
    if (!parsed.success) {
      const next: BrandingErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof Branding;
        next[field] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  };
  const change = (next: Branding) => {
    setDraft(next);
    setErrors({});
  };

  return (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, lg: 6 }}>
        <SectionCard title="Brand" subtitle="Colours and logo for this client’s dashboard and employee app">
          <BrandingEditor value={draft} onChange={change} companyName={tenantName} errors={errors} disabled={!canManage || save.isPending} />
          {canManage && (
            <Stack direction="row" spacing={1} sx={{ mt: 3, pt: 2.5, borderTop: 1, borderColor: 'divider', alignItems: 'center' }}>
              <Button color="inherit" onClick={() => change(DEFAULT_BRANDING)} disabled={save.isPending || sameBranding(draft, DEFAULT_BRANDING)}>
                Use default
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button color="inherit" onClick={() => change(branding)} disabled={!dirty || save.isPending}>Discard</Button>
              <Button variant="contained" onClick={submit} disabled={!dirty} loading={save.isPending}>Save branding</Button>
            </Stack>
          )}
        </SectionCard>
      </Grid>
      <Grid size={{ xs: 12, lg: 6 }}>
        <Stack spacing={2} sx={{ position: { lg: 'sticky' }, top: { lg: 88 } }}>
          <SectionCard>
            <BrandPreview branding={draft} companyName={tenantName} />
          </SectionCard>
          <Alert severity="info" variant="outlined">
            The dashboard picks up new colours the next time a page loads; the employee app picks them up the next time it opens.
          </Alert>
        </Stack>
      </Grid>
    </Grid>
  );
}
