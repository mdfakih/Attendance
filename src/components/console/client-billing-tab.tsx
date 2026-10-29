'use client';

import { useState, type ReactNode } from 'react';
import AddCardOutlinedIcon from '@mui/icons-material/AddCardOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/loading';
import { SectionCard } from '@/components/common/section-card';
import { SoftChip } from '@/components/common/status-chip';
import { useSnackbar } from '@/components/common/snackbar';
import { formatDate, formatInr } from '@/lib/format';
import { consoleApi } from '@/lib/http';
import { IssueChargeDialog, RecordPaymentDialog } from './billing-dialogs';
import { balanceDue } from './money';
import { useConsoleSession } from './console-session';
import { BILLING_STATUS, PAYMENT_METHOD_LABEL, type Charge, type TenantDetail } from './types';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
      <Typography variant="body2" component="div" sx={{ fontWeight: 700 }}>{children}</Typography>
    </Box>
  );
}

const cellPad = { '& td:first-of-type, & th:first-of-type': { pl: 2.5 }, '& td:last-of-type, & th:last-of-type': { pr: 2.5 } };

interface ClientBillingTabProps {
  readonly tenant: TenantDetail;
  readonly onChanged: () => void;
}

export function ClientBillingTab({ tenant, onChanged }: ClientBillingTabProps) {
  const { canBill } = useConsoleSession();
  const { notify, notifyError } = useSnackbar();
  const [dialog, setDialog] = useState<'charge' | 'payment' | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; charge: Charge } | null>(null);
  const [voiding, setVoiding] = useState<Charge | null>(null);
  const done = () => { setDialog(null); onChanged(); };
  const issue = useMutation({
    mutationFn: (id: string) => consoleApi.post(`/charges/${id}/issue`, {}),
    onSuccess: () => { notify('Charge issued'); onChanged(); },
    onError: notifyError,
  });
  const voidCharge = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => consoleApi.post(`/charges/${id}/void`, { reason }),
    onSuccess: () => { notify('Charge voided'); setVoiding(null); onChanged(); },
    onError: notifyError,
  });
  const sub = tenant.subscription;
  const status = sub ? BILLING_STATUS[sub.status] : undefined;
  const balance = tenant.charges
    .filter((c) => c.status === 'DUE' || c.status === 'OVERDUE' || c.status === 'PARTIALLY_PAID')
    .reduce((sum, c) => sum + Number(balanceDue(c)), 0);

  return (
    <Grid container spacing={2.5}>
      <Grid size={12}>
        <SectionCard
          title="Subscription"
          action={
            canBill && (
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" startIcon={<ReceiptLongOutlinedIcon />} onClick={() => setDialog('charge')} disabled={!sub}>Issue charge</Button>
                <Button size="small" variant="contained" startIcon={<AddCardOutlinedIcon />} onClick={() => setDialog('payment')}>Record payment</Button>
              </Stack>
            )
          }
        >
          {sub ? (
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 6, md: 2 }}><Fact label="Plan">{sub.planName}</Fact></Grid>
              <Grid size={{ xs: 6, md: 2 }}><Fact label="Status"><SoftChip dot label={status?.label ?? sub.status} tone={status?.tone ?? 'default'} /></Fact></Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <Fact label="Price per employee">{formatInr(sub.priceOverride ?? sub.pricePerEmployee)}{sub.priceOverride && <Typography variant="caption" color="text.secondary"> (custom)</Typography>}</Fact>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}><Fact label="Current period">{formatDate(sub.currentPeriodStart)} – {formatDate(sub.currentPeriodEnd)}</Fact></Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Fact label={sub.trialEndsAt && sub.status === 'TRIALING' ? 'Trial ends' : 'Next due'}>{formatDate(sub.trialEndsAt && sub.status === 'TRIALING' ? sub.trialEndsAt : sub.nextDueDate)}</Fact>
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <Fact label="Balance due"><Box component="span" sx={{ color: balance > 0 ? 'warning.main' : 'success.main' }}>{formatInr(balance)}</Box></Fact>
              </Grid>
              {sub.notes && <Grid size={12}><Fact label="Notes">{sub.notes}</Fact></Grid>}
            </Grid>
          ) : (
            <EmptyState compact icon={<ReceiptLongOutlinedIcon />} title="No subscription" description="This client has no plan attached." />
          )}
        </SectionCard>
      </Grid>

      <Grid size={{ xs: 12, lg: 7 }}>
        <SectionCard flush title="Charges" subtitle="Last 12 periods" icon={<ReceiptLongOutlinedIcon />}>
          {tenant.charges.length === 0 ? (
            <EmptyState compact icon={<ReceiptLongOutlinedIcon />} title="No charges yet" description={canBill ? 'Use “Issue charge” to bill a period.' : undefined} />
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={cellPad}>
                <TableHead>
                  <TableRow><TableCell>Period</TableCell><TableCell align="right">Staff</TableCell><TableCell align="right">Total</TableCell><TableCell align="right">Paid</TableCell><TableCell>Due</TableCell><TableCell>Status</TableCell>{canBill && <TableCell />}</TableRow>
                </TableHead>
                <TableBody>
                  {tenant.charges.map((c) => {
                    const s = BILLING_STATUS[c.status];
                    const actionable = c.status === 'DRAFT' || ((c.status === 'DUE' || c.status === 'OVERDUE') && Number(c.amountPaid) === 0);
                    return (
                      <TableRow key={c.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatDate(c.periodStart)} – {formatDate(c.periodEnd)}</Typography>
                          {c.invoiceNo && <Typography variant="caption" color="text.secondary">Invoice {c.invoiceNo}</Typography>}
                        </TableCell>
                        <TableCell align="right">{c.billableEmployees}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{formatInr(c.total)}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatInr(c.amountPaid)}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(c.dueDate)}</TableCell>
                        <TableCell><SoftChip dot label={s?.label ?? c.status} tone={s?.tone ?? 'default'} /></TableCell>
                        {canBill && (
                          <TableCell align="right" sx={{ width: 48 }}>
                            {actionable && (
                              <IconButton size="small" aria-label="Charge actions" onClick={(e) => setMenu({ anchor: e.currentTarget, charge: c })}>
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
        </SectionCard>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <SectionCard flush title="Payments" subtitle="Last 12 received" icon={<PaymentsOutlinedIcon />}>
          {tenant.payments.length === 0 ? (
            <EmptyState compact icon={<PaymentsOutlinedIcon />} title="No payments yet" />
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={cellPad}>
                <TableHead><TableRow><TableCell>Received</TableCell><TableCell align="right">Amount</TableCell><TableCell>Method</TableCell></TableRow></TableHead>
                <TableBody>
                  {tenant.payments.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(p.receivedOn)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main', whiteSpace: 'nowrap' }}>{formatInr(p.amount)}</TableCell>
                      <TableCell>
                        {PAYMENT_METHOD_LABEL[p.method] ?? p.method}
                        {p.referenceNo && <Typography variant="caption" color="text.secondary" component="div">{p.referenceNo}</Typography>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </SectionCard>
      </Grid>

      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        {menu?.charge.status === 'DRAFT' && (
          <MenuItem onClick={() => { issue.mutate(menu.charge.id); setMenu(null); }}>Issue now</MenuItem>
        )}
        <MenuItem sx={{ color: 'error.main' }} onClick={() => { setVoiding(menu?.charge ?? null); setMenu(null); }}>Void charge…</MenuItem>
      </Menu>
      {dialog === 'charge' && <IssueChargeDialog tenantId={tenant.id} open onClose={() => setDialog(null)} onDone={done} onRefresh={onChanged} />}
      {dialog === 'payment' && <RecordPaymentDialog tenantId={tenant.id} charges={tenant.charges} open onClose={() => setDialog(null)} onDone={done} />}
      <ConfirmDialog
        open={!!voiding}
        title="Void this charge?"
        message={voiding ? `The ${formatInr(voiding.total)} charge for ${formatDate(voiding.periodStart)} – ${formatDate(voiding.periodEnd)} will no longer be owed.` : ''}
        confirmLabel="Void charge"
        destructive
        reasonLabel="Reason"
        busy={voidCharge.isPending}
        onClose={() => setVoiding(null)}
        onConfirm={(reason) => voiding && voidCharge.mutate({ id: voiding.id, reason })}
      />
    </Grid>
  );
}
