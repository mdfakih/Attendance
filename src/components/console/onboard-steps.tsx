'use client';

import type { ReactNode } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { TenantAvatar } from '@/components/brand/tenant-avatar';
import { EmptyState } from '@/components/common/loading';
import { formatInr } from '@/lib/format';
import { tint } from '@/lib/tone';
import { BrandingEditor } from './branding-editor';
import { BrandPreview } from './brand-preview';
import { slugify, type OnboardErrors, type OnboardForm } from './onboard-form';
import { INDIAN_STATES, type Plan } from './types';

interface StepProps {
  readonly form: OnboardForm;
  readonly errors: OnboardErrors;
  readonly set: (patch: Partial<OnboardForm>) => void;
}

const row = { direction: { xs: 'column', sm: 'row' }, spacing: 2 } as const;

export function CompanyStep({ form, errors, set }: StepProps) {
  return (
    <Stack spacing={2.25}>
      <Stack {...row}>
        <TextField
          label="Company name"
          placeholder="Acme Industries"
          autoFocus
          value={form.displayName}
          error={!!errors.displayName}
          helperText={errors.displayName ?? 'Shown to the client’s team and employees'}
          onChange={(e) => set({ displayName: e.target.value, ...(form.slugTouched ? {} : { slug: slugify(e.target.value) }) })}
        />
        <TextField
          label="Short ID"
          value={form.slug}
          error={!!errors.slug}
          helperText={errors.slug ?? 'Lowercase letters, numbers and dashes'}
          onChange={(e) => set({ slug: e.target.value.toLowerCase(), slugTouched: true })}
        />
      </Stack>
      <TextField label="Registered legal name" placeholder="Acme Industries Private Limited" value={form.legalName} error={!!errors.legalName} helperText={errors.legalName ?? 'As it should appear on invoices'} onChange={(e) => set({ legalName: e.target.value })} />
      <Stack {...row}>
        <TextField select label="State" value={form.stateCode} error={!!errors.stateCode} helperText={errors.stateCode ?? 'Used for GST and holidays'} onChange={(e) => set({ stateCode: e.target.value })}>
          {INDIAN_STATES.map((s) => <MenuItem key={s.code} value={s.code}>{s.name}</MenuItem>)}
        </TextField>
        <TextField label="GSTIN (optional)" value={form.gstin} error={!!errors.gstin} helperText={errors.gstin ?? '15 characters, if registered'} onChange={(e) => set({ gstin: e.target.value.toUpperCase() })} slotProps={{ htmlInput: { maxLength: 15 } }} />
      </Stack>
      <TextField label="Billing email" type="email" placeholder="accounts@acme.com" value={form.billingEmail} error={!!errors.billingEmail} helperText={errors.billingEmail ?? 'Invoices and payment reminders go here'} onChange={(e) => set({ billingEmail: e.target.value })} />
    </Stack>
  );
}

export function PlanStep({ form, errors, set, plans }: StepProps & { plans: readonly Plan[] | undefined }) {
  const active = (plans ?? []).filter((p) => p.active);
  const selected = active.find((p) => p.id === form.planId);
  return (
    <Stack spacing={2.25}>
      {active.length === 0 ? (
        <Alert severity="warning">There are no active plans. Create one under Plans & pricing first.</Alert>
      ) : (
        <Box role="radiogroup" aria-label="Plan" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
          {active.map((p) => {
            const isSelected = p.id === form.planId;
            return (
              <ButtonBase
                key={p.id}
                role="radio"
                aria-checked={isSelected}
                onClick={() => set({ planId: p.id, trialDays: String(p.trialDays) })}
                sx={(t) => ({
                  display: 'block',
                  textAlign: 'left',
                  p: 2,
                  borderRadius: 3,
                  border: 2,
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  bgcolor: isSelected ? tint(t, 'primary', 0.05) : 'background.paper',
                })}
              >
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{p.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{p.code} · v{p.version}</Typography>
                  </Box>
                  {isSelected && <CheckCircleIcon color="primary" fontSize="small" />}
                </Stack>
                <Typography sx={{ mt: 1, fontWeight: 800, fontSize: '1.25rem' }}>
                  {formatInr(p.pricePerEmployee)}
                  <Typography component="span" variant="body2" color="text.secondary"> / employee / month</Typography>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {p.trialDays}-day trial · min {p.minBillableEmployees} billable{p.defaultEmployeeCap ? ` · cap ${p.defaultEmployeeCap}` : ''}
                </Typography>
              </ButtonBase>
            );
          })}
        </Box>
      )}
      {errors.planId && <Typography variant="body2" color="error">{errors.planId}</Typography>}
      <Stack {...row}>
        <TextField type="number" label="Free trial" value={form.trialDays} error={!!errors.trialDays} helperText={errors.trialDays ?? '0 to start billing right away'} onChange={(e) => set({ trialDays: e.target.value })} slotProps={{ input: { endAdornment: <InputAdornment position="end">days</InputAdornment> }, htmlInput: { min: 0, max: 90 } }} />
        <TextField
          type="number"
          label="Employee limit (optional)"
          value={form.employeeCap}
          error={!!errors.employeeCap}
          helperText={errors.employeeCap ?? (selected?.defaultEmployeeCap ? `Empty uses the plan’s ${selected.defaultEmployeeCap}` : 'Empty means no limit')}
          onChange={(e) => set({ employeeCap: e.target.value })}
          slotProps={{ htmlInput: { min: 1 } }}
        />
      </Stack>
      <TextField select label="Pay features" value={form.payrollTier} helperText="Full payroll is coming later" onChange={(e) => set({ payrollTier: e.target.value as OnboardForm['payrollTier'] })}>
        <MenuItem value="BASIC">Basic pay monitoring</MenuItem>
        <MenuItem value="FULL" disabled>Full payroll (coming later)</MenuItem>
      </TextField>
    </Stack>
  );
}

export function AdminStep({ form, errors, set }: StepProps) {
  return (
    <Stack spacing={2.25}>
      <Alert severity="info" variant="outlined">
        This person gets full access to {form.displayName || 'the company'}’s dashboard. We email them a link to set their password (valid for 7 days).
      </Alert>
      <TextField label="Full name" autoFocus value={form.adminName} error={!!errors.adminName} helperText={errors.adminName} onChange={(e) => set({ adminName: e.target.value })} />
      <TextField label="Work email" type="email" value={form.adminEmail} error={!!errors.adminEmail} helperText={errors.adminEmail ?? 'The invitation is sent here'} onChange={(e) => set({ adminEmail: e.target.value })} />
    </Stack>
  );
}

export function BrandingStep({ form, errors, set }: StepProps) {
  return (
    <Stack spacing={3}>
      <BrandingEditor value={form.branding} companyName={form.displayName} errors={{ primaryColor: errors.primaryColor, accentColor: errors.accentColor, logoUrl: errors.logoUrl }} onChange={(branding) => set({ branding })} />
      <BrandPreview branding={form.branding} companyName={form.displayName} />
    </Stack>
  );
}

function ReviewRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 140, flexShrink: 0 }}>{label}</Typography>
      <Typography variant="body2" component="div" sx={{ fontWeight: 600, minWidth: 0, wordBreak: 'break-word' }}>{children}</Typography>
    </Stack>
  );
}

export function ReviewStep({ form, plans }: { form: OnboardForm; plans: readonly Plan[] | undefined }) {
  const plan = plans?.find((p) => p.id === form.planId);
  const state = INDIAN_STATES.find((s) => s.code === form.stateCode)?.name ?? form.stateCode;
  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
        <TenantAvatar name={form.displayName} logoUrl={form.branding.logoUrl} color={form.branding.primaryColor} size={52} />
        <Box>
          <Typography variant="h6">{form.displayName}</Typography>
          <Typography variant="body2" color="text.secondary">{form.legalName}</Typography>
        </Box>
      </Stack>
      <Divider />
      <ReviewRow label="Short ID">{form.slug}</ReviewRow>
      <ReviewRow label="State · GSTIN">{state}{form.gstin ? ` · ${form.gstin}` : ''}</ReviewRow>
      <ReviewRow label="Billing email">{form.billingEmail}</ReviewRow>
      <Divider />
      <ReviewRow label="Plan">{plan ? `${plan.name} · ${formatInr(plan.pricePerEmployee)} per employee` : '—'}</ReviewRow>
      <ReviewRow label="Trial">{Number(form.trialDays) > 0 ? `${form.trialDays} days free` : 'No trial'}</ReviewRow>
      <ReviewRow label="Employee limit">{form.employeeCap || (plan?.defaultEmployeeCap ? `${plan.defaultEmployeeCap} (plan default)` : 'No limit')}</ReviewRow>
      <Divider />
      <ReviewRow label="First admin">{form.adminName} · {form.adminEmail}</ReviewRow>
      <ReviewRow label="Colours">
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {[form.branding.primaryColor, form.branding.accentColor].map((c) => <Box key={c} sx={{ width: 18, height: 18, borderRadius: 1, bgcolor: c, border: 1, borderColor: 'divider' }} />)}
          <span>{form.branding.primaryColor} / {form.branding.accentColor}</span>
        </Stack>
      </ReviewRow>
    </Box>
  );
}

export function CreatedStep({ name, email }: { name: string; email: string }) {
  return (
    <EmptyState
      icon={<CheckCircleIcon />}
      title={`${name} is ready`}
      description={`We emailed an invitation to ${email}. Once they set a password they can add employees and invite their team.`}
    />
  );
}
