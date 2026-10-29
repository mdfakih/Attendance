'use client';

import { useMemo, useState } from 'react';
import { planSchema } from '@attendance/contracts';
import AddIcon from '@mui/icons-material/Add';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState, ErrorAlert, StatGridSkeleton } from '@/components/common/loading';
import { FormDialog } from '@/components/common/form-dialog';
import { PageHeader } from '@/components/common/page-header';
import { SoftChip } from '@/components/common/status-chip';
import { useSnackbar } from '@/components/common/snackbar';
import { useConsoleSession } from '@/components/console/console-session';
import type { Plan } from '@/components/console/types';
import { formatInr } from '@/lib/format';
import { consoleApi } from '@/lib/http';

interface PlanForm {
  code: string;
  name: string;
  pricePerEmployee: string;
  minBillableEmployees: string;
  defaultEmployeeCap: string;
  trialDays: string;
}

const EMPTY: PlanForm = { code: '', name: '', pricePerEmployee: '', minBillableEmployees: '0', defaultEmployeeCap: '', trialDays: '14' };
type Errors = Partial<Record<keyof PlanForm, string>>;

const FRIENDLY: Errors = {
  code: 'Use 2–30 capital letters, numbers or _ (e.g. GROWTH).',
  name: 'Enter a name (2–80 characters).',
  pricePerEmployee: 'Enter a price like 49 or 49.50.',
  minBillableEmployees: 'Use 0 or more.',
  defaultEmployeeCap: 'Use 1 or more, or leave empty.',
  trialDays: 'Use 0 to 90 days.',
};

function Line({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.6 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{value}</Typography>
    </Stack>
  );
}

function PlanCard({ plan, canEdit, busy, onToggle }: { plan: Plan; canEdit: boolean; busy: boolean; onToggle: () => void }) {
  return (
    <Card sx={{ height: '100%', opacity: plan.active ? 1 : 0.72 }}>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" noWrap>{plan.name}</Typography>
            <Typography variant="caption" color="text.secondary">{plan.code} · version {plan.version}</Typography>
          </Box>
          <SoftChip dot label={plan.active ? 'Available' : 'Retired'} tone={plan.active ? 'success' : 'default'} />
        </Stack>
        <Typography sx={{ fontFamily: 'var(--font-display), inherit', fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.02em' }}>
          {formatInr(plan.pricePerEmployee)}
          <Typography component="span" variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}> / employee / month</Typography>
        </Typography>
        <Divider sx={{ my: 1.5 }} />
        <Line label="Free trial" value={plan.trialDays ? `${plan.trialDays} days` : 'None'} />
        <Line label="Minimum billed" value={`${plan.minBillableEmployees} employees`} />
        <Line label="Default employee limit" value={plan.defaultEmployeeCap ? plan.defaultEmployeeCap.toLocaleString('en-IN') : 'No limit'} />
        <Line label="Payment due" value={`${plan.paymentTermsDays} days after issue`} />
        {canEdit && (
          <Button fullWidth variant="outlined" color={plan.active ? 'inherit' : 'primary'} sx={{ mt: 2 }} loading={busy} onClick={onToggle}>
            {plan.active ? 'Retire plan' : 'Make available again'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function PlansPage() {
  const { canEditPlans } = useConsoleSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PlanForm | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [retiring, setRetiring] = useState<Plan | null>(null);
  const plans = useQuery({ queryKey: ['console-plans'], queryFn: () => consoleApi.get<Plan[]>('/plans') });
  const sorted = useMemo(() => [...(plans.data ?? [])].sort((a, b) => Number(b.active) - Number(a.active) || a.code.localeCompare(b.code) || b.version - a.version), [plans.data]);
  const existing = form && sorted.find((p) => p.code === form.code.trim().toUpperCase());
  const create = useMutation({
    mutationFn: (body: unknown) => consoleApi.post('/plans', body),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['console-plans'] }); setForm(null); notify('Plan created'); },
    onError: notifyError,
  });
  const toggle = useMutation({
    mutationFn: (p: Plan) => consoleApi.patch(`/plans/${p.id}`, { active: !p.active }),
    onSuccess: (_, p) => { void queryClient.invalidateQueries({ queryKey: ['console-plans'] }); setRetiring(null); notify(p.active ? `${p.name} retired` : `${p.name} is available again`); },
    onError: notifyError,
  });
  const set = (patch: Partial<PlanForm>) => {
    setForm((f) => (f ? { ...f, ...patch } : f));
    setErrors({});
  };
  const submit = () => {
    if (!form) return;
    const parsed = planSchema.safeParse({
      ...form,
      pricePerEmployee: form.pricePerEmployee.trim(),
      defaultEmployeeCap: form.defaultEmployeeCap.trim() ? form.defaultEmployeeCap : null,
    });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof PlanForm;
        next[field] ??= FRIENDLY[field] ?? issue.message;
      }
      setErrors(next);
      return;
    }
    create.mutate(parsed.data);
  };

  return (
    <>
      <PageHeader
        title="Plans & pricing"
        subtitle="Prices are per employee per month, before GST. Changing a price creates a new version — existing clients keep the version they’re on."
        actions={canEditPlans && <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setErrors({}); setForm(EMPTY); }}>New plan</Button>}
      />
      {plans.error && <ErrorAlert error={plans.error} onRetry={() => plans.refetch()} />}
      {plans.isLoading ? (
        <StatGridSkeleton count={3} />
      ) : sorted.length === 0 ? (
        <Card><EmptyState icon={<SellOutlinedIcon />} title="No plans yet" description="Create a plan before onboarding your first client." action={canEditPlans && <Button variant="contained" onClick={() => setForm(EMPTY)}>Create a plan</Button>} /></Card>
      ) : (
        <Grid container spacing={2.5}>
          {sorted.map((p) => (
            <Grid key={p.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <PlanCard plan={p} canEdit={canEditPlans} busy={toggle.isPending && toggle.variables?.id === p.id} onToggle={() => (p.active ? setRetiring(p) : toggle.mutate(p))} />
            </Grid>
          ))}
        </Grid>
      )}

      <FormDialog
        open={!!form}
        title="New plan"
        subtitle="Clients choose from available plans when they are onboarded."
        submitLabel="Create plan"
        busy={create.isPending}
        maxWidth="xs"
        onClose={() => setForm(null)}
        onSubmit={submit}
      >
        {form && (
          <>
            <Stack direction="row" spacing={2}>
              <TextField label="Code" value={form.code} autoFocus error={!!errors.code} helperText={errors.code ?? 'Short ID, e.g. GROWTH'} onChange={(e) => set({ code: e.target.value.toUpperCase() })} />
              <TextField label="Name" value={form.name} error={!!errors.name} helperText={errors.name ?? 'Shown to your team'} onChange={(e) => set({ name: e.target.value })} />
            </Stack>
            {existing && <Alert severity="info" variant="outlined">This creates version {Math.max(...sorted.filter((p) => p.code === existing.code).map((p) => p.version)) + 1} of {existing.code}. Clients already on it keep their current price.</Alert>}
            <TextField
              label="Price per employee per month"
              value={form.pricePerEmployee}
              error={!!errors.pricePerEmployee}
              helperText={errors.pricePerEmployee ?? 'Before GST'}
              onChange={(e) => set({ pricePerEmployee: e.target.value })}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { inputMode: 'decimal' } }}
            />
            <Stack direction="row" spacing={2}>
              <TextField type="number" label="Minimum billed" value={form.minBillableEmployees} error={!!errors.minBillableEmployees} helperText={errors.minBillableEmployees ?? 'Employees billed at least'} onChange={(e) => set({ minBillableEmployees: e.target.value })} />
              <TextField type="number" label="Employee limit" value={form.defaultEmployeeCap} error={!!errors.defaultEmployeeCap} helperText={errors.defaultEmployeeCap ?? 'Empty = no limit'} onChange={(e) => set({ defaultEmployeeCap: e.target.value })} />
            </Stack>
            <TextField type="number" label="Free trial" value={form.trialDays} error={!!errors.trialDays} helperText={errors.trialDays} onChange={(e) => set({ trialDays: e.target.value })} slotProps={{ input: { endAdornment: <InputAdornment position="end">days</InputAdornment> } }} />
          </>
        )}
      </FormDialog>
      <ConfirmDialog
        open={!!retiring}
        title={`Retire ${retiring?.name ?? 'plan'}?`}
        message="New clients can’t choose it any more. Clients already on this plan are not affected."
        confirmLabel="Retire plan"
        destructive
        busy={toggle.isPending}
        onClose={() => setRetiring(null)}
        onConfirm={() => retiring && toggle.mutate(retiring)}
      />
    </>
  );
}
