'use client';

import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { FeatureKey } from '@attendance/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useShifts } from '@/components/common/filters';
import { Loading } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { formatDate, formatInr } from '@/lib/format';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

interface Settings {
  payableDaysBasis: string;
  defaultOtMultiplier: string;
  activationCodeTtlDays: number;
  defaultSiteRadiusM: number;
  defaultMaxAccuracyM: number;
  accuracyBufferCapM: number;
  selfieRetentionDays: number;
  missingOutReminder: boolean;
  defaultShiftId: string | null;
}
interface Feature {
  key: FeatureKey;
  label: string;
  description: string;
  enabled: boolean;
}
interface Billing {
  plan: string | null;
  status: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  pricePerEmployee: string | null;
  charges: Array<{ id: string; periodStart: string; periodEnd: string; billableEmployees: number; total: string; amountPaid: string; status: string; dueDate: string | null; invoiceNo: string | null }>;
}

export default function SettingsPage() {
  const { can, isAdmin, session, refresh } = useSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.get<Settings>('/settings') });
  const features = useQuery({ queryKey: ['features'], queryFn: () => api.get<Feature[]>('/features') });
  const billing = useQuery({ queryKey: ['billing'], queryFn: () => api.get<Billing>('/billing'), enabled: isAdmin });
  const shifts = useShifts();
  const [form, setForm] = useState<Settings | null>(null);
  useEffect(() => { if (settings.data && !form) setForm(settings.data); }, [settings.data, form]);
  const save = useMutation({
    mutationFn: async (f: Settings) => {
      await api.patch('/settings', { activationCodeTtlDays: f.activationCodeTtlDays, defaultSiteRadiusM: f.defaultSiteRadiusM, defaultMaxAccuracyM: f.defaultMaxAccuracyM, accuracyBufferCapM: f.accuracyBufferCapM, selfieRetentionDays: f.selfieRetentionDays, missingOutReminder: f.missingOutReminder, defaultShiftId: f.defaultShiftId });
      if (can('PAY', 'edit')) await api.put('/settings/pay', { payableDaysBasis: f.payableDaysBasis, defaultOtMultiplier: Number(f.defaultOtMultiplier) });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings'] }); refresh(); notify('Settings saved'); },
    onError: notifyError,
  });
  const toggle = useMutation({
    mutationFn: (f: { key: FeatureKey; enabled: boolean }) => api.put('/features', f),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['features'] }); refresh(); },
    onError: notifyError,
  });
  const n = (v: string) => Number(v);

  return (
    <>
      <PageHeader title="Settings" subtitle={`${session.tenant.displayName} · ${session.tenant.legalName} · ${session.tenant.timezone}`} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ mb: 2 }}><CardContent>
            <Typography variant="h6" gutterBottom>Attendance</Typography>
            {!form ? <Loading minHeight={80} /> : (
              <Stack spacing={2}>
                <Stack direction="row" spacing={1}>
                  <TextField type="number" label="Default site radius (m)" value={form.defaultSiteRadiusM} onChange={(e) => setForm({ ...form, defaultSiteRadiusM: n(e.target.value) })} />
                  <TextField type="number" label="Max GPS error (m)" value={form.defaultMaxAccuracyM} onChange={(e) => setForm({ ...form, defaultMaxAccuracyM: n(e.target.value) })} />
                  <TextField type="number" label="GPS tolerance cap (m)" value={form.accuracyBufferCapM} onChange={(e) => setForm({ ...form, accuracyBufferCapM: n(e.target.value) })} helperText="Extra distance allowed for GPS error" />
                </Stack>
                <Stack direction="row" spacing={1}>
                  <TextField type="number" label="Activation code validity (days)" value={form.activationCodeTtlDays} onChange={(e) => setForm({ ...form, activationCodeTtlDays: n(e.target.value) })} />
                  <TextField type="number" label="Keep selfies for (days)" value={form.selfieRetentionDays} onChange={(e) => setForm({ ...form, selfieRetentionDays: n(e.target.value) })} helperText="30–365; deleted automatically afterwards" />
                </Stack>
                <TextField select label="Company working hours" value={shifts.data ? (form.defaultShiftId ?? '') : ''} onChange={(e) => setForm({ ...form, defaultShiftId: e.target.value || null })} disabled={!shifts.data} helperText="Applies to everyone unless their branch or the employee has its own shift. Time punched outside these hours counts only once approved.">
                  <MenuItem value="">None</MenuItem>
                  {shifts.data?.map((s) => <MenuItem key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</MenuItem>)}
                </TextField>
                <TextField select label="Remind employees who forget to punch out" value={form.missingOutReminder ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, missingOutReminder: e.target.value === 'yes' })}><MenuItem value="yes">Yes, 30 minutes after shift end</MenuItem><MenuItem value="no">No</MenuItem></TextField>
                <Typography variant="h6">Pay</Typography>
                <Stack direction="row" spacing={1}>
                  <TextField select label="Monthly salary divided by" value={form.payableDaysBasis} onChange={(e) => setForm({ ...form, payableDaysBasis: e.target.value })} disabled={!can('PAY', 'edit')}>
                    <MenuItem value="CALENDAR">Calendar days in the month</MenuItem><MenuItem value="FIXED_26">Fixed 26 days</MenuItem><MenuItem value="FIXED_30">Fixed 30 days</MenuItem><MenuItem value="WORKING_DAYS">Working days in the month</MenuItem>
                  </TextField>
                  <TextField type="number" label="Default overtime multiplier" value={form.defaultOtMultiplier} onChange={(e) => setForm({ ...form, defaultOtMultiplier: e.target.value })} disabled={!can('PAY', 'edit')} helperText="e.g. 1.5 or 2" />
                </Stack>
                {can('SETTINGS', 'edit') && <Button variant="contained" onClick={() => save.mutate(form)} disabled={save.isPending} sx={{ alignSelf: 'flex-start' }}>Save settings</Button>}
              </Stack>
            )}
          </CardContent></Card>
          {isAdmin && (
            <Card><CardContent>
              <Typography variant="h6" gutterBottom>Optional features</Typography>
              {features.isLoading ? <Loading minHeight={60} /> : features.data?.map((f) => (
                <Stack key={f.key} direction="row" spacing={2} sx={{ alignItems: 'center', py: 1 }}>
                  <Switch checked={f.enabled} onChange={(e) => toggle.mutate({ key: f.key, enabled: e.target.checked })} />
                  <div><Typography>{f.label}</Typography><Typography variant="body2" color="text.secondary">{f.description}</Typography></div>
                </Stack>
              ))}
            </CardContent></Card>
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          {isAdmin && (
            <Card><CardContent>
              <Typography variant="h6" gutterBottom>Subscription</Typography>
              {billing.isLoading ? <Loading minHeight={60} /> : billing.data && (
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><Typography>{billing.data.plan ?? 'No plan'}</Typography><Chip size="small" label={billing.data.status ?? '—'} color={billing.data.status === 'ACTIVE' || billing.data.status === 'TRIALING' ? 'success' : 'warning'} variant="outlined" /></Stack>
                  <Typography variant="body2" color="text.secondary">{formatInr(billing.data.pricePerEmployee)} per employee per month · period {formatDate(billing.data.currentPeriodStart)} – {formatDate(billing.data.currentPeriodEnd)}{billing.data.trialEndsAt ? ` · trial ends ${formatDate(billing.data.trialEndsAt)}` : ''}</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>Pay tier: <strong>{session.tenant.payrollTier === 'BASIC' ? 'Basic pay monitoring' : 'Full payroll'}</strong></Typography>
                  {billing.data.charges.length > 0 && (
                    <Table size="small"><TableBody>
                      {billing.data.charges.map((c) => <TableRow key={c.id}><TableCell>{formatDate(c.periodStart)} – {formatDate(c.periodEnd)}</TableCell><TableCell align="right">{formatInr(c.total)}</TableCell><TableCell><Chip size="small" label={c.status} color={c.status === 'PAID' ? 'success' : c.status === 'OVERDUE' ? 'error' : 'default'} variant="outlined" /></TableCell></TableRow>)}
                    </TableBody></Table>
                  )}
                  <Typography variant="caption" color="text.secondary">Invoices and payments are handled by your account manager.</Typography>
                </Stack>
              )}
            </CardContent></Card>
          )}
        </Grid>
      </Grid>
    </>
  );
}
