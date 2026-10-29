'use client';

import { useState } from 'react';
import Link from 'next/link';
import AddBusinessOutlinedIcon from '@mui/icons-material/AddBusinessOutlined';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import ReportGmailerrorredOutlinedIcon from '@mui/icons-material/ReportGmailerrorredOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, ErrorAlert, StatGridSkeleton } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { SectionCard } from '@/components/common/section-card';
import { StatCard } from '@/components/common/stat-card';
import { SoftChip } from '@/components/common/status-chip';
import { useConsoleSession } from '@/components/console/console-session';
import { balanceDue } from '@/components/console/money';
import { OnboardClientDialog } from '@/components/console/onboard-client-dialog';
import { BILLING_STATUS, PAYMENT_METHOD_LABEL, TENANT_STATUS, type Overview } from '@/components/console/types';
import { formatDate, formatInr } from '@/lib/format';
import { consoleApi } from '@/lib/http';
import type { ToneOrNeutral } from '@/lib/tone';

const STATUS_ORDER = ['ACTIVE', 'TRIAL', 'PAST_DUE', 'SUSPENDED', 'CANCELLED'] as const;
const BAR_COLOR: Record<ToneOrNeutral, string> = {
  success: 'success.main', info: 'info.main', warning: 'warning.main', error: 'error.main', default: 'text.disabled', primary: 'primary.main', secondary: 'secondary.main',
};

function StatusBreakdown({ byStatus }: { byStatus: Record<string, number> }) {
  const total = STATUS_ORDER.reduce((sum, s) => sum + (byStatus[s] ?? 0), 0);
  return (
    <Box>
      <Box sx={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', bgcolor: 'action.hover', mb: 2 }}>
        {total > 0 && STATUS_ORDER.map((s) => (byStatus[s] ?? 0) > 0 && (
          <Tooltip key={s} title={`${TENANT_STATUS[s].label}: ${byStatus[s]}`}>
            <Box sx={{ width: `${((byStatus[s] ?? 0) / total) * 100}%`, bgcolor: BAR_COLOR[TENANT_STATUS[s].tone] }} />
          </Tooltip>
        ))}
      </Box>
      <Stack spacing={0.5}>
        {STATUS_ORDER.map((s) => (
          <Stack key={s} component={Link} href={`/console/tenants?status=${s}`} direction="row" sx={{ alignItems: 'center', py: 0.75, px: 1, mx: -1, borderRadius: 2, '&:hover': { bgcolor: 'action.hover' } }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: BAR_COLOR[TENANT_STATUS[s].tone], mr: 1.5 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{TENANT_STATUS[s].label}</Typography>
              <Typography variant="caption" color="text.secondary">{TENANT_STATUS[s].help}</Typography>
            </Box>
            <Typography sx={{ fontWeight: 800 }}>{byStatus[s] ?? 0}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

export default function ConsoleOverview() {
  const { canManage } = useConsoleSession();
  const [onboarding, setOnboarding] = useState(false);
  const overview = useQuery({ queryKey: ['console-overview'], queryFn: () => consoleApi.get<Overview>('/overview') });
  const o = overview.data;
  const total = o ? Object.values(o.tenantsByStatus).reduce((a, b) => a + b, 0) : 0;
  const attention = o ? (o.tenantsByStatus['PAST_DUE'] ?? 0) + (o.tenantsByStatus['SUSPENDED'] ?? 0) : 0;
  const outstanding = Number(o?.outstanding ?? 0);

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Your clients, their people and what’s owed — at a glance."
        actions={canManage && <Button variant="contained" startIcon={<AddBusinessOutlinedIcon />} onClick={() => setOnboarding(true)}>Onboard client</Button>}
      />
      {overview.error && <Box sx={{ mb: 2 }}><ErrorAlert error={overview.error} onRetry={() => overview.refetch()} /></Box>}
      {!o ? (
        !overview.error && <StatGridSkeleton count={4} />
      ) : (
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard label="Clients" value={total} icon={<ApartmentOutlinedIcon />} caption={`${o.tenantsByStatus['ACTIVE'] ?? 0} active · ${o.tenantsByStatus['TRIAL'] ?? 0} on trial`} href="/console/tenants" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard label="Employees on the platform" value={o.activeEmployees.toLocaleString('en-IN')} icon={<BadgeOutlinedIcon />} tone="secondary" caption="Active across all clients" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard label="Outstanding" value={formatInr(o.outstanding)} icon={<CurrencyRupeeIcon />} tone="warning" highlight={outstanding > 0} caption={`${o.dueCharges.length} unpaid charge${o.dueCharges.length === 1 ? '' : 's'}`} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard label="Need attention" value={attention} icon={<ReportGmailerrorredOutlinedIcon />} tone="error" highlight={attention > 0} caption="Past due or suspended" href={attention > 0 ? '/console/tenants?status=PAST_DUE' : undefined} />
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <SectionCard title="Clients by status" subtitle="Click a status to see those clients">
              <StatusBreakdown byStatus={o.tenantsByStatus} />
            </SectionCard>
          </Grid>
          <Grid size={{ xs: 12, lg: 8 }}>
            <SectionCard flush title="Due & overdue charges" subtitle="Oldest due date first" icon={<ReceiptLongOutlinedIcon />}>
              {o.dueCharges.length === 0 ? (
                <EmptyState compact icon={<ReceiptLongOutlinedIcon />} title="Nothing due" description="Every client is paid up." />
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow><TableCell sx={{ pl: 2.5 }}>Client</TableCell><TableCell align="right">Balance</TableCell><TableCell>Due on</TableCell><TableCell sx={{ pr: 2.5 }}>Status</TableCell></TableRow>
                    </TableHead>
                    <TableBody>
                      {o.dueCharges.map((c) => (
                        <TableRow key={c.id} hover>
                          <TableCell sx={{ pl: 2.5 }}>
                            <Typography component={Link} href={`/console/tenants/${c.tenantId}?tab=billing`} variant="body2" sx={{ fontWeight: 600, '&:hover': { color: 'primary.main' } }}>{c.tenantName}</Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>{formatInr(balanceDue(c))}</TableCell>
                          <TableCell>{formatDate(c.dueDate)}</TableCell>
                          <TableCell sx={{ pr: 2.5 }}><SoftChip dot label={BILLING_STATUS[c.status]?.label ?? c.status} tone={BILLING_STATUS[c.status]?.tone ?? 'default'} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </SectionCard>
          </Grid>
          <Grid size={12}>
            <SectionCard flush title="Recent payments" subtitle="Last 10 recorded" icon={<PaymentsOutlinedIcon />}>
              {o.recentPayments.length === 0 ? (
                <EmptyState compact icon={<PaymentsOutlinedIcon />} title="No payments yet" description="Payments you record on a client’s Billing tab appear here." />
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow><TableCell sx={{ pl: 2.5 }}>Client</TableCell><TableCell align="right">Amount</TableCell><TableCell>Method</TableCell><TableCell sx={{ pr: 2.5 }}>Received</TableCell></TableRow>
                    </TableHead>
                    <TableBody>
                      {o.recentPayments.map((p) => (
                        <TableRow key={p.id} hover>
                          <TableCell sx={{ pl: 2.5, fontWeight: 600 }}>{p.tenantName}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>{formatInr(p.amount)}</TableCell>
                          <TableCell>{PAYMENT_METHOD_LABEL[p.method] ?? p.method}</TableCell>
                          <TableCell sx={{ pr: 2.5 }}>{formatDate(p.receivedOn)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </SectionCard>
          </Grid>
        </Grid>
      )}
      <OnboardClientDialog open={onboarding} onClose={() => setOnboarding(false)} />
    </>
  );
}
