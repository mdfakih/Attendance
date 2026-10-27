'use client';

import Link from 'next/link';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { Loading } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { formatDate, formatInr } from '@/lib/format';
import { consoleApi } from '@/lib/http';

interface Overview {
  tenantsByStatus: Record<string, number>;
  activeEmployees: number;
  outstanding: string | null;
  dueCharges: Array<{ id: string; tenantId: string; tenantName: string; total: string; amountPaid: string; dueDate: string | null; status: string }>;
  recentPayments: Array<{ id: string; tenantName: string; amount: string; method: string; receivedOn: string | null }>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <Card><CardContent><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="h4" sx={{ fontWeight: 700 }}>{value}</Typography></CardContent></Card>;
}

export default function ConsoleOverview() {
  const overview = useQuery({ queryKey: ['console-overview'], queryFn: () => consoleApi.get<Overview>('/overview') });
  const o = overview.data;
  if (!o) return <Loading />;
  const tenants = Object.values(o.tenantsByStatus).reduce((a, b) => a + b, 0);
  return (
    <>
      <PageHeader title="Overview" />
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}><Stat label="Clients" value={tenants} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Stat label="Active / trial" value={`${o.tenantsByStatus['ACTIVE'] ?? 0} / ${o.tenantsByStatus['TRIAL'] ?? 0}`} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Stat label="Active employees" value={o.activeEmployees} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><Stat label="Outstanding" value={formatInr(o.outstanding)} /></Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card><CardContent>
            <Typography variant="h6" gutterBottom>Due & overdue charges</Typography>
            {o.dueCharges.length === 0 ? <Typography color="text.secondary">Nothing due.</Typography> : (
              <Table size="small">
                <TableHead><TableRow><TableCell>Client</TableCell><TableCell align="right">Amount</TableCell><TableCell>Due</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
                <TableBody>{o.dueCharges.map((c) => <TableRow key={c.id}><TableCell><Link href={`/console/tenants/${c.tenantId}`}>{c.tenantName}</Link></TableCell><TableCell align="right">{formatInr(c.total)}</TableCell><TableCell>{formatDate(c.dueDate)}</TableCell><TableCell><Chip size="small" label={c.status} color={c.status === 'OVERDUE' ? 'error' : 'warning'} variant="outlined" /></TableCell></TableRow>)}</TableBody>
              </Table>
            )}
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card><CardContent>
            <Typography variant="h6" gutterBottom>Recent payments</Typography>
            {o.recentPayments.length === 0 ? <Typography color="text.secondary">None yet.</Typography> : (
              <Table size="small"><TableBody>{o.recentPayments.map((p) => <TableRow key={p.id}><TableCell>{p.tenantName}</TableCell><TableCell align="right">{formatInr(p.amount)}</TableCell><TableCell>{p.method}</TableCell><TableCell>{formatDate(p.receivedOn)}</TableCell></TableRow>)}</TableBody></Table>
            )}
          </CardContent></Card>
        </Grid>
      </Grid>
    </>
  );
}
