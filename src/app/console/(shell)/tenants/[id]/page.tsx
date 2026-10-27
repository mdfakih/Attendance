'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormDialog } from '@/components/common/form-dialog';
import { ErrorAlert, Loading } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { formatDate, formatDateTime, formatInr, thisMonth, todayIso } from '@/lib/format';
import { consoleApi } from '@/lib/http';

interface TenantDetail {
  id: string;
  slug: string;
  displayName: string;
  legalName: string;
  gstin: string | null;
  stateCode: string;
  billingEmail: string;
  timezone: string;
  status: string;
  statusReason: string | null;
  payrollTier: string;
  employeeCap: number | null;
  createdAt: string;
  employees: { active: number; invited: number };
  admins: Array<{ email: string; fullName: string; lastLoginAt: string | null }>;
  pendingInvites: Array<{ id: string; email: string; fullName: string; expiresAt: string }>;
  subscription: { id: string; planId: string; planName: string; status: string; currentPeriodStart: string | null; currentPeriodEnd: string | null; nextDueDate: string | null; trialEndsAt: string | null; pricePerEmployee: string | null; priceOverride: string | null; notes: string | null } | null;
  charges: Array<{ id: string; periodStart: string; periodEnd: string; billableEmployees: number; total: string; amountPaid: string; status: string; dueDate: string | null; invoiceNo: string | null }>;
  payments: Array<{ id: string; amount: string; method: string; referenceNo: string | null; receivedOn: string | null; status: string }>;
}

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = { ACTIVE: 'success', TRIAL: 'info', PAST_DUE: 'warning', SUSPENDED: 'error', CANCELLED: 'default', DUE: 'warning', OVERDUE: 'error', PAID: 'success', DRAFT: 'default', VOID: 'default' };

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<'suspend' | 'reactivate' | null>(null);
  const [charge, setCharge] = useState<{ periodStart: string; periodEnd: string; invoiceNo: string } | null>(null);
  const [payment, setPayment] = useState<{ chargeId: string; amount: string; method: string; referenceNo: string; receivedOn: string } | null>(null);
  const [edit, setEdit] = useState<{ employeeCap: string; payrollTier: string } | null>(null);
  const tenant = useQuery({ queryKey: ['console-tenant', id], queryFn: () => consoleApi.get<TenantDetail>(`/tenants/${id}`) });
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ['console-tenant', id] }); queryClient.invalidateQueries({ queryKey: ['console-tenants'] }); queryClient.invalidateQueries({ queryKey: ['console-overview'] }); };
  const setStatus = useMutation({ mutationFn: ({ action, reason }: { action: string; reason: string }) => consoleApi.post(`/tenants/${id}/${action}`, { reason }), onSuccess: () => { refresh(); setConfirm(null); notify('Status updated'); }, onError: notifyError });
  const createCharge = useMutation({ mutationFn: async (c: NonNullable<typeof charge>) => { const created = await consoleApi.post<{ id: string }>(`/tenants/${id}/charges`, { ...c, invoiceNo: c.invoiceNo || undefined }); await consoleApi.post(`/charges/${created.id}/issue`, {}); }, onSuccess: () => { refresh(); setCharge(null); notify('Charge issued'); }, onError: notifyError });
  const recordPayment = useMutation({ mutationFn: (p: NonNullable<typeof payment>) => consoleApi.post(`/tenants/${id}/payments`, { ...p, chargeId: p.chargeId || undefined, referenceNo: p.referenceNo || undefined }), onSuccess: () => { refresh(); setPayment(null); notify('Payment recorded'); }, onError: notifyError });
  const update = useMutation({ mutationFn: (e: NonNullable<typeof edit>) => consoleApi.patch(`/tenants/${id}`, { employeeCap: e.employeeCap ? Number(e.employeeCap) : null, payrollTier: e.payrollTier }), onSuccess: () => { refresh(); setEdit(null); notify('Client updated'); }, onError: notifyError });
  const resend = useMutation({ mutationFn: (email: string) => consoleApi.post(`/tenants/${id}/resend-invite`, { email }), onSuccess: () => notify('Invitation re-sent'), onError: notifyError });

  if (tenant.isLoading) return <Loading />;
  if (tenant.error || !tenant.data) return <ErrorAlert error={tenant.error ?? new Error('Not found')} />;
  const t = tenant.data;
  const month = thisMonth();
  return (
    <>
      <PageHeader
        title={t.displayName}
        subtitle={`${t.legalName} · ${t.slug} · ${t.stateCode}${t.gstin ? ` · ${t.gstin}` : ''} · ${t.billingEmail}`}
        actions={<>
          <Chip label={t.status} color={STATUS_COLOR[t.status]} />
          <Button onClick={() => setEdit({ employeeCap: t.employeeCap ? String(t.employeeCap) : '', payrollTier: t.payrollTier })}>Edit plan limits</Button>
          {t.status !== 'SUSPENDED' && t.status !== 'CANCELLED' && <Button color="error" variant="outlined" onClick={() => setConfirm('suspend')}>Suspend</Button>}
          {(t.status === 'SUSPENDED' || t.status === 'PAST_DUE') && <Button color="success" variant="contained" onClick={() => setConfirm('reactivate')}>Reactivate</Button>}
        </>}
      />
      {t.statusReason && <Typography color="text.secondary" sx={{ mb: 2 }}>Status note: {t.statusReason}</Typography>}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ mb: 2 }}><CardContent>
            <Typography variant="overline" color="text.secondary">Usage</Typography>
            <Typography variant="h5">{t.employees.active} active · {t.employees.invited} invited</Typography>
            <Typography variant="body2" color="text.secondary">Cap {t.employeeCap ?? 'none'} · Pay tier {t.payrollTier} · since {formatDate(t.createdAt)}</Typography>
          </CardContent></Card>
          <Card><CardContent>
            <Typography variant="overline" color="text.secondary">Admins</Typography>
            {t.admins.map((a) => <Typography key={a.email} variant="body2">{a.fullName} · {a.email} · last sign-in {formatDateTime(a.lastLoginAt)}</Typography>)}
            {t.pendingInvites.map((i) => <Stack key={i.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}><Typography variant="body2" color="text.secondary">{i.email} (invited, expires {formatDate(i.expiresAt)})</Typography><Button size="small" onClick={() => resend.mutate(i.email)}>Resend</Button></Stack>)}
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ mb: 2 }}><CardContent>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">Subscription</Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" onClick={() => setCharge({ periodStart: `${month}-01`, periodEnd: todayIso(), invoiceNo: '' })}>Issue charge</Button>
                <Button size="small" variant="contained" onClick={() => setPayment({ chargeId: t.charges.find((c) => c.status === 'DUE' || c.status === 'OVERDUE')?.id ?? '', amount: '', method: 'BANK_TRANSFER', referenceNo: '', receivedOn: todayIso() })}>Record payment</Button>
              </Stack>
            </Stack>
            {t.subscription ? (
              <Typography variant="body2">{t.subscription.planName} · <Chip size="small" label={t.subscription.status} color={STATUS_COLOR[t.subscription.status === 'TRIALING' ? 'TRIAL' : t.subscription.status]} variant="outlined" /> · {formatInr(t.subscription.priceOverride ?? t.subscription.pricePerEmployee)} per employee · period {formatDate(t.subscription.currentPeriodStart)} – {formatDate(t.subscription.currentPeriodEnd)}{t.subscription.nextDueDate ? ` · next due ${formatDate(t.subscription.nextDueDate)}` : ''}</Typography>
            ) : <Typography color="text.secondary">No subscription.</Typography>}
            <Typography variant="subtitle2" sx={{ mt: 2 }}>Charges</Typography>
            {t.charges.length === 0 ? <Typography variant="body2" color="text.secondary">None yet.</Typography> : (
              <Table size="small">
                <TableHead><TableRow><TableCell>Period</TableCell><TableCell align="right">Employees</TableCell><TableCell align="right">Total (incl. GST)</TableCell><TableCell align="right">Paid</TableCell><TableCell>Due</TableCell><TableCell>Invoice</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
                <TableBody>{t.charges.map((c) => <TableRow key={c.id}><TableCell>{formatDate(c.periodStart)} – {formatDate(c.periodEnd)}</TableCell><TableCell align="right">{c.billableEmployees}</TableCell><TableCell align="right">{formatInr(c.total)}</TableCell><TableCell align="right">{formatInr(c.amountPaid)}</TableCell><TableCell>{formatDate(c.dueDate)}</TableCell><TableCell>{c.invoiceNo ?? '—'}</TableCell><TableCell><Chip size="small" label={c.status} color={STATUS_COLOR[c.status]} variant="outlined" /></TableCell></TableRow>)}</TableBody>
              </Table>
            )}
            <Typography variant="subtitle2" sx={{ mt: 2 }}>Payments</Typography>
            {t.payments.length === 0 ? <Typography variant="body2" color="text.secondary">None yet.</Typography> : (
              <Table size="small"><TableBody>{t.payments.map((p) => <TableRow key={p.id}><TableCell>{formatDate(p.receivedOn)}</TableCell><TableCell align="right">{formatInr(p.amount)}</TableCell><TableCell>{p.method}</TableCell><TableCell>{p.referenceNo ?? '—'}</TableCell></TableRow>)}</TableBody></Table>
            )}
          </CardContent></Card>
        </Grid>
      </Grid>

      <ConfirmDialog open={!!confirm} title={confirm === 'suspend' ? 'Suspend this client?' : 'Reactivate this client?'} message={confirm === 'suspend' ? 'Employees cannot punch and the dashboard becomes read-only until reactivated.' : 'Restores full access.'} confirmLabel={confirm === 'suspend' ? 'Suspend' : 'Reactivate'} destructive={confirm === 'suspend'} reasonLabel="Reason" busy={setStatus.isPending} onClose={() => setConfirm(null)} onConfirm={(reason) => confirm && setStatus.mutate({ action: confirm, reason })} />
      <FormDialog open={!!charge} title="Issue a charge" submitLabel="Create & issue" busy={createCharge.isPending} onClose={() => setCharge(null)} onSubmit={() => charge && createCharge.mutate(charge)} maxWidth="xs">
        {charge && (<>
          <TextField type="date" label="Period start" value={charge.periodStart} onChange={(e) => setCharge({ ...charge, periodStart: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField type="date" label="Period end" value={charge.periodEnd} onChange={(e) => setCharge({ ...charge, periodEnd: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Invoice number (from accounting)" value={charge.invoiceNo} onChange={(e) => setCharge({ ...charge, invoiceNo: e.target.value })} />
          <Typography variant="caption" color="text.secondary">Amount = active + invited employees (min. plan minimum) × plan price, plus 18% GST.</Typography>
        </>)}
      </FormDialog>
      <FormDialog open={!!payment} title="Record a payment" busy={recordPayment.isPending} onClose={() => setPayment(null)} onSubmit={() => payment && recordPayment.mutate(payment)} maxWidth="xs">
        {payment && (<>
          <TextField select label="Against charge" value={payment.chargeId} onChange={(e) => setPayment({ ...payment, chargeId: e.target.value })}><MenuItem value="">Unallocated</MenuItem>{t.charges.filter((c) => c.status !== 'PAID' && c.status !== 'VOID').map((c) => <MenuItem key={c.id} value={c.id}>{formatDate(c.periodStart)} – {formatDate(c.periodEnd)} · {formatInr(c.total)}</MenuItem>)}</TextField>
          <TextField label="Amount (₹)" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} autoFocus />
          <TextField select label="Method" value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}><MenuItem value="BANK_TRANSFER">Bank transfer</MenuItem><MenuItem value="UPI">UPI</MenuItem><MenuItem value="CHEQUE">Cheque</MenuItem><MenuItem value="CASH">Cash</MenuItem><MenuItem value="OTHER">Other</MenuItem></TextField>
          <TextField label="Reference (UTR / cheque no.)" value={payment.referenceNo} onChange={(e) => setPayment({ ...payment, referenceNo: e.target.value })} />
          <TextField type="date" label="Received on" value={payment.receivedOn} onChange={(e) => setPayment({ ...payment, receivedOn: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        </>)}
      </FormDialog>
      <FormDialog open={!!edit} title="Plan limits" busy={update.isPending} onClose={() => setEdit(null)} onSubmit={() => edit && update.mutate(edit)} maxWidth="xs">
        {edit && (<>
          <TextField type="number" label="Employee cap (blank = none)" value={edit.employeeCap} onChange={(e) => setEdit({ ...edit, employeeCap: e.target.value })} />
          <TextField select label="Pay tier" value={edit.payrollTier} onChange={(e) => setEdit({ ...edit, payrollTier: e.target.value })}><MenuItem value="BASIC">Basic pay monitoring</MenuItem><MenuItem value="FULL" disabled>Full payroll (coming later)</MenuItem></TextField>
        </>)}
      </FormDialog>
    </>
  );
}
