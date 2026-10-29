'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useMutation } from '@tanstack/react-query';
import { FormDialog } from '@/components/common/form-dialog';
import { useSnackbar } from '@/components/common/snackbar';
import { formatDate, formatInr, thisMonth, todayIso } from '@/lib/format';
import { consoleApi } from '@/lib/http';
import { balanceDue } from './money';
import { PAYMENT_METHOD_LABEL, type Charge } from './types';

interface DialogProps {
  readonly tenantId: string;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onDone: () => void;
}

export function IssueChargeDialog({ tenantId, open, onClose, onDone, onRefresh }: DialogProps & { onRefresh: () => void }) {
  const { notify, notifyError } = useSnackbar();
  const [form, setForm] = useState(() => ({ periodStart: `${thisMonth()}-01`, periodEnd: todayIso(), invoiceNo: '' }));
  // Set once the charge exists, so a failed "issue" is retried on its own instead of creating a second charge.
  const [draftId, setDraftId] = useState<string | null>(null);
  const invalid = !draftId && (!form.periodStart || !form.periodEnd || form.periodEnd < form.periodStart);
  const create = useMutation({
    mutationFn: async () => {
      let id = draftId;
      if (!id) {
        id = (await consoleApi.post<{ id: string }>(`/tenants/${tenantId}/charges`, { ...form, invoiceNo: form.invoiceNo.trim() || undefined })).id;
        setDraftId(id);
      }
      await consoleApi.post(`/charges/${id}/issue`, {});
    },
    onSuccess: () => { notify('Charge issued'); onDone(); },
    onError: (error) => { notifyError(error); onRefresh(); },
  });
  return (
    <FormDialog
      open={open}
      title="Issue a charge"
      subtitle="Bills the client for a period. The due date follows the plan’s payment terms."
      submitLabel={draftId ? 'Try issuing again' : 'Create & issue'}
      busy={create.isPending}
      submitDisabled={invalid}
      maxWidth="xs"
      onClose={onClose}
      onSubmit={() => create.mutate()}
    >
      {draftId && (
        <Alert severity="warning">The charge was saved as a draft but not issued yet. Try again, or issue it later from the charges list.</Alert>
      )}
      <Stack direction="row" spacing={2}>
        <TextField type="date" label="From" disabled={!!draftId} value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField type="date" label="To" disabled={!!draftId} value={form.periodEnd} error={invalid && !!form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
      </Stack>
      <TextField label="Invoice number (optional)" disabled={!!draftId} value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} helperText="From your accounting system" />
      <Alert severity="info" variant="outlined">Amount = active + invited employees (at least the plan minimum) × plan price, plus 18% GST.</Alert>
    </FormDialog>
  );
}

export function RecordPaymentDialog({ tenantId, open, onClose, onDone, charges }: DialogProps & { charges: readonly Charge[] }) {
  const { notify, notifyError } = useSnackbar();
  const open_ = charges.filter((c) => c.status === 'DUE' || c.status === 'OVERDUE' || c.status === 'PARTIALLY_PAID');
  const [form, setForm] = useState(() => {
    const first = open_[0];
    return {
      chargeId: first?.id ?? '',
      amount: first ? balanceDue(first) : '',
      method: 'BANK_TRANSFER',
      referenceNo: '',
      receivedOn: todayIso(),
    };
  });
  const amountOk = /^\d+(\.\d{1,2})?$/.test(form.amount.trim()) && Number(form.amount) > 0;
  const linked = open_.find((c) => c.id === form.chargeId);
  const overpaying = amountOk && !!linked && Number(form.amount) > Number(balanceDue(linked));
  const save = useMutation({
    mutationFn: () => consoleApi.post(`/tenants/${tenantId}/payments`, { ...form, amount: form.amount.trim(), chargeId: form.chargeId || undefined, referenceNo: form.referenceNo.trim() || undefined }),
    onSuccess: () => { notify('Payment recorded'); onDone(); },
    onError: notifyError,
  });
  return (
    <FormDialog
      open={open}
      title="Record a payment"
      subtitle="Log money you have received from this client."
      busy={save.isPending}
      submitDisabled={!amountOk || !form.receivedOn}
      maxWidth="xs"
      onClose={onClose}
      onSubmit={() => save.mutate()}
    >
      <TextField
        select
        label="For charge"
        value={form.chargeId}
        onChange={(e) => {
          const charge = open_.find((c) => c.id === e.target.value);
          setForm({ ...form, chargeId: e.target.value, amount: charge ? balanceDue(charge) : form.amount });
        }}
      >
        <MenuItem value="">Not linked to a charge</MenuItem>
        {open_.map((c) => (
          <MenuItem key={c.id} value={c.id}>{formatDate(c.periodStart)} – {formatDate(c.periodEnd)} · {formatInr(balanceDue(c))} due</MenuItem>
        ))}
      </TextField>
      <TextField
        label="Amount"
        value={form.amount}
        autoFocus
        error={!!form.amount && !amountOk}
        helperText={form.amount && !amountOk ? 'Enter an amount like 12500 or 12500.50' : overpaying && linked ? `More than the ${formatInr(balanceDue(linked))} still due — check the amount.` : undefined}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
        slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { inputMode: 'decimal' } }}
      />
      <Stack direction="row" spacing={2}>
        <TextField select label="Method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
          {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
        </TextField>
        <TextField type="date" label="Received on" value={form.receivedOn} onChange={(e) => setForm({ ...form, receivedOn: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
      </Stack>
      <TextField label="Reference (optional)" placeholder="UTR or cheque number" value={form.referenceNo} onChange={(e) => setForm({ ...form, referenceNo: e.target.value })} />
    </FormDialog>
  );
}
