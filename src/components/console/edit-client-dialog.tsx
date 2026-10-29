'use client';

import { useState } from 'react';
import { updateTenantSchema } from '@attendance/contracts';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormDialog } from '@/components/common/form-dialog';
import { useSnackbar } from '@/components/common/snackbar';
import { consoleApi } from '@/lib/http';
import { INDIAN_STATES, type TenantDetail } from './types';

interface Draft {
  displayName: string;
  legalName: string;
  billingEmail: string;
  gstin: string;
  stateCode: string;
  employeeCap: string;
  payrollTier: string;
}

type Errors = Partial<Record<keyof Draft, string>>;

function fromTenant(t: TenantDetail): Draft {
  return {
    displayName: t.displayName,
    legalName: t.legalName,
    billingEmail: t.billingEmail,
    gstin: t.gstin ?? '',
    stateCode: t.stateCode,
    employeeCap: t.employeeCap ? String(t.employeeCap) : '',
    payrollTier: t.payrollTier,
  };
}

interface EditClientDialogProps {
  readonly tenant: TenantDetail;
  readonly open: boolean;
  readonly onClose: () => void;
}

export function EditClientDialog({ tenant, open, onClose }: EditClientDialogProps) {
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => fromTenant(tenant));
  const [errors, setErrors] = useState<Errors>({});
  const save = useMutation({
    mutationFn: (body: unknown) => consoleApi.patch(`/tenants/${tenant.id}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['console-tenant', tenant.id] });
      void queryClient.invalidateQueries({ queryKey: ['console-tenants'] });
      notify('Client details updated');
      onClose();
    },
    onError: notifyError,
  });
  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors({});
  };
  const submit = () => {
    const parsed = updateTenantSchema.safeParse({
      ...draft,
      gstin: draft.gstin.trim() ? draft.gstin : null,
      employeeCap: draft.employeeCap.trim() ? draft.employeeCap : null,
    });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof Draft] ??= issue.message;
      setErrors(next);
      return;
    }
    save.mutate(parsed.data);
  };

  return (
    <FormDialog
      open={open}
      title="Edit client details"
      subtitle="Changes show up on the client’s dashboard and future invoices."
      busy={save.isPending}
      onClose={onClose}
      onSubmit={submit}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Company name" value={draft.displayName} error={!!errors.displayName} helperText={errors.displayName} onChange={(e) => set({ displayName: e.target.value })} />
        <TextField label="Registered legal name" value={draft.legalName} error={!!errors.legalName} helperText={errors.legalName} onChange={(e) => set({ legalName: e.target.value })} />
      </Stack>
      <TextField label="Billing email" type="email" value={draft.billingEmail} error={!!errors.billingEmail} helperText={errors.billingEmail} onChange={(e) => set({ billingEmail: e.target.value })} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField select label="State" value={draft.stateCode} onChange={(e) => set({ stateCode: e.target.value })}>
          {INDIAN_STATES.map((s) => <MenuItem key={s.code} value={s.code}>{s.name}</MenuItem>)}
        </TextField>
        <TextField label="GSTIN (optional)" value={draft.gstin} error={!!errors.gstin} helperText={errors.gstin} onChange={(e) => set({ gstin: e.target.value.toUpperCase() })} slotProps={{ htmlInput: { maxLength: 15 } }} />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField type="number" label="Employee limit" value={draft.employeeCap} error={!!errors.employeeCap} helperText={errors.employeeCap ?? 'Leave empty for no limit'} onChange={(e) => set({ employeeCap: e.target.value })} />
        <TextField select label="Pay features" value={draft.payrollTier} onChange={(e) => set({ payrollTier: e.target.value })}>
          <MenuItem value="BASIC">Basic pay monitoring</MenuItem>
          <MenuItem value="FULL" disabled>Full payroll (coming later)</MenuItem>
        </TextField>
      </Stack>
    </FormDialog>
  );
}
