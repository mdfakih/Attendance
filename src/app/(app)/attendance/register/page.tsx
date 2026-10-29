'use client';

import { useState } from 'react';
import Link from 'next/link';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { FilterBar } from '@/components/admin/filter-bar';
import { NamedSelect, useBranches, useDepartments } from '@/components/common/filters';
import { EmptyState, ErrorAlert, TableSkeleton } from '@/components/common/loading';
import { MonthPicker } from '@/components/common/month-picker';
import { PageHeader } from '@/components/common/page-header';
import { formatMinutes, monthLabel, thisMonth } from '@/lib/format';
import { tenantHttp } from '@/lib/http';
import { tint, type Tone } from '@/lib/tone';

interface RegisterRow {
  employee: { id: string; fullName: string; employeeCode: string | null };
  days: Record<string, string>;
  totals: { present: number; halfDay: number; absent: number; leave: number; weeklyOff: number; holiday: number; late: number; lopDays: number; workedMinutes: number; otMinutes: number };
}

interface Register {
  dates: string[];
  items: RegisterRow[];
  meta: { total: number };
}

/** Day codes in the register and how each is coloured. */
const CODES: ReadonlyArray<{ code: string; label: string; tone: Tone | null }> = [
  { code: 'P', label: 'Present', tone: 'success' },
  { code: 'HD', label: 'Half day', tone: 'warning' },
  { code: 'A', label: 'Absent', tone: 'error' },
  { code: 'L', label: 'Leave', tone: 'secondary' },
  { code: 'HL', label: 'Half-day leave', tone: 'warning' },
  { code: 'H', label: 'Holiday', tone: 'info' },
  { code: 'WO', label: 'Weekly off', tone: null },
  { code: 'MO', label: 'Missing out', tone: 'error' },
];
const TONE = new Map(CODES.map((c) => [c.code, c.tone]));

function CodeCell({ code }: { code: string | undefined }) {
  const tone = code ? TONE.get(code) : undefined;
  return (
    <TableCell
      align="center"
      sx={(t) => ({
        fontWeight: 700,
        color: tone ? `${tone}.main` : 'text.secondary',
        bgcolor: tone ? tint(t, tone, 0.12) : code ? 'action.hover' : 'transparent',
      })}
    >
      {code ?? ''}
    </TableCell>
  );
}

export default function RegisterPage() {
  const [month, setMonth] = useState(thisMonth());
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const params = { month, branchId: branchId || undefined, departmentId: departmentId || undefined, page, pageSize };
  const register = useQuery({
    queryKey: ['attendance-register', params],
    queryFn: async () => (await tenantHttp.get<{ data: Register }>('/attendance/register', { params })).data.data,
  });
  const branches = useBranches();
  const departments = useDepartments();
  const data = register.data;
  const sticky = { position: 'sticky', left: 0, bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider' } as const;

  return (
    <>
      <PageHeader
        title="Monthly register"
        subtitle={`Everyone’s attendance for ${monthLabel(month)}, day by day, with totals.`}
        actions={<Button component={Link} href={`/exports?type=ATTENDANCE_REGISTER&month=${month}`} variant="outlined" startIcon={<FileDownloadOutlinedIcon />}>Export</Button>}
      />
      <FilterBar
        end={CODES.map((c) => (
          <Stack key={c.code} direction="row" spacing={0.75} sx={{ alignItems: 'center', mr: 1 }}>
            <Box sx={(t) => ({ minWidth: 26, px: 0.5, py: 0.25, borderRadius: 1, textAlign: 'center', fontSize: 11, fontWeight: 800, color: c.tone ? `${c.tone}.main` : 'text.secondary', bgcolor: c.tone ? tint(t, c.tone, 0.12) : 'action.hover' })}>{c.code}</Box>
            <Typography variant="caption" color="text.secondary">{c.label}</Typography>
          </Stack>
        ))}
      >
        <MonthPicker value={month} onChange={(m) => { setMonth(m); setPage(1); }} />
        <NamedSelect label="Branch" value={branchId} onChange={(v) => { setBranchId(v); setPage(1); }} options={branches.data} allLabel="All branches" />
        <NamedSelect label="Department" value={departmentId} onChange={(v) => { setDepartmentId(v); setPage(1); }} options={departments.data} allLabel="All departments" />
      </FilterBar>
      {register.error ? (
        <ErrorAlert error={register.error} onRetry={() => register.refetch()} />
      ) : register.isLoading || !data ? (
        <TableSkeleton rows={8} />
      ) : data.items.length === 0 ? (
        <Paper variant="outlined" sx={{ borderRadius: 3.5 }}>
          <EmptyState icon={<GridViewOutlinedIcon />} title="No attendance for this month" description="Try another month or clear the branch and department filters." />
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 3.5, overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 360px)', minHeight: 300 }}>
            <Table size="small" stickyHeader sx={{ '& td, & th': { px: 0.75, fontSize: 12, whiteSpace: 'nowrap' } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...sticky, zIndex: 3, minWidth: 200 }}>Employee</TableCell>
                  {data.dates.map((d) => <TableCell key={d} align="center">{d.slice(8)}</TableCell>)}
                  {['P', 'HD', 'A', 'L', 'Late', 'LOP', 'Hours'].map((h) => <TableCell key={h} align="right">{h}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={row.employee.id} hover>
                    <TableCell sx={{ ...sticky, zIndex: 2 }}>
                      <Typography component={Link} href={`/employees/${row.employee.id}`} variant="body2" color="primary" sx={{ fontWeight: 600, fontSize: 12.5 }}>{row.employee.fullName}</Typography>
                      {row.employee.employeeCode && <Typography component="span" variant="caption" color="text.secondary"> {row.employee.employeeCode}</Typography>}
                    </TableCell>
                    {data.dates.map((d) => <CodeCell key={d} code={row.days[d]} />)}
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{row.totals.present}</TableCell>
                    <TableCell align="right">{row.totals.halfDay}</TableCell>
                    <TableCell align="right">{row.totals.absent}</TableCell>
                    <TableCell align="right">{row.totals.leave}</TableCell>
                    <TableCell align="right">{row.totals.late}</TableCell>
                    <TableCell align="right">{row.totals.lopDays}</TableCell>
                    <TableCell align="right">{formatMinutes(row.totals.workedMinutes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={data.meta.total} page={page - 1} onPageChange={(_, p) => setPage(p + 1)} rowsPerPage={pageSize} onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} rowsPerPageOptions={[25, 50, 100]} />
        </Paper>
      )}
    </>
  );
}
