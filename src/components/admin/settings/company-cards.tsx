'use client';

import type { ReactNode } from 'react';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { TenantAvatar } from '@/components/brand/tenant-avatar';
import { Loading } from '@/components/common/loading';
import { SectionCard } from '@/components/common/section-card';
import { SoftChip } from '@/components/common/status-chip';
import { formatDate, formatInr } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { ToneOrNeutral } from '@/lib/tone';

export interface Billing {
  plan: string | null;
  status: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  pricePerEmployee: string | null;
  charges: Array<{ id: string; periodStart: string; periodEnd: string; billableEmployees: number; total: string; amountPaid: string; status: string; dueDate: string | null; invoiceNo: string | null }>;
}

const SUB_STATUS: Record<string, { label: string; tone: ToneOrNeutral }> = {
  TRIALING: { label: 'Trial', tone: 'info' },
  ACTIVE: { label: 'Active', tone: 'success' },
  PAST_DUE: { label: 'Past due', tone: 'warning' },
  SUSPENDED: { label: 'Suspended', tone: 'error' },
  CANCELLED: { label: 'Cancelled', tone: 'default' },
};

const CHARGE_STATUS: Record<string, { label: string; tone: ToneOrNeutral }> = {
  DUE: { label: 'Due', tone: 'warning' },
  OVERDUE: { label: 'Overdue', tone: 'error' },
  PAID: { label: 'Paid', tone: 'success' },
  PARTIALLY_PAID: { label: 'Part paid', tone: 'info' },
  VOID: { label: 'Void', tone: 'default' },
};

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{value}</Typography>
    </Stack>
  );
}

export function CompanyCard() {
  const { session } = useSession();
  const t = session.tenant;
  return (
    <SectionCard title="Company" icon={<ApartmentOutlinedIcon />}>
      <Row label="Display name" value={t.displayName} />
      <Row label="Legal name" value={t.legalName} />
      <Row label="Time zone" value={t.timezone} />
      <Row label="State" value={t.stateCode} />
      <Row label="Pay tier" value={t.payrollTier === 'BASIC' ? 'Basic pay monitoring' : 'Full payroll'} />
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>To change company details, contact your account manager.</Typography>
    </SectionCard>
  );
}

function Swatch({ label, color }: { label: string; color: string }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: color, border: 1, borderColor: 'divider' }} />
      <Box>
        <Typography variant="caption" color="text.secondary" component="div">{label}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{color}</Typography>
      </Box>
    </Stack>
  );
}

export function BrandingCard() {
  const { session } = useSession();
  const { branding, displayName } = session.tenant;
  return (
    <SectionCard title="Branding" icon={<PaletteOutlinedIcon />}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
        <TenantAvatar name={displayName} logoUrl={branding.logoUrl} size={52} />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }} noWrap>{displayName}</Typography>
          <Typography variant="caption" color="text.secondary">{branding.logoUrl ? 'Custom logo' : 'Initials (no logo set)'}</Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={3} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Swatch label="Primary" color={branding.primaryColor} />
        <Swatch label="Accent" color={branding.accentColor} />
      </Stack>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 2 }}>
        Your colours and logo are managed by your account manager. They also appear in your employees’ mobile app.
      </Typography>
    </SectionCard>
  );
}

export function SubscriptionCard({ billing, loading }: { billing: Billing | undefined; loading: boolean }) {
  const status = billing?.status ? (SUB_STATUS[billing.status] ?? { label: billing.status, tone: 'default' as const }) : null;
  return (
    <SectionCard title="Subscription" icon={<ReceiptLongOutlinedIcon />} action={status ? <SoftChip label={status.label} tone={status.tone} dot /> : undefined}>
      {loading ? <Loading minHeight={100} /> : !billing ? null : (
        <>
          <Row label="Plan" value={billing.plan ?? 'No plan'} />
          <Row label="Price" value={`${formatInr(billing.pricePerEmployee)} per employee / month`} />
          <Row label="Current period" value={`${formatDate(billing.currentPeriodStart)} – ${formatDate(billing.currentPeriodEnd)}`} />
          {billing.trialEndsAt && <Row label="Trial ends" value={formatDate(billing.trialEndsAt)} />}
          {billing.charges.length > 0 && (
            <>
              <Typography variant="overline" color="text.secondary" component="div" sx={{ mt: 1.5 }}>Recent charges</Typography>
              <Table size="small">
                <TableBody>
                  {billing.charges.map((c) => {
                    const cs = CHARGE_STATUS[c.status] ?? { label: c.status, tone: 'default' as const };
                    return (
                      <TableRow key={c.id}>
                        <TableCell sx={{ pl: 0 }}>{formatDate(c.periodStart)} – {formatDate(c.periodEnd)}</TableCell>
                        <TableCell align="right">{formatInr(c.total)}</TableCell>
                        <TableCell align="right" sx={{ pr: 0 }}><SoftChip label={cs.label} tone={cs.tone} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5 }}>Invoices and payments are handled by your account manager.</Typography>
        </>
      )}
    </SectionCard>
  );
}
