'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { NamedSelect, useBranches, useDepartments } from '@/components/common/filters';
import { Loading } from '@/components/common/loading';
import { MonthPicker } from '@/components/common/month-picker';
import { PageHeader } from '@/components/common/page-header';
import { formatMinutes, thisMonth } from '@/lib/format';
import { tenantHttp } from '@/lib/http';

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

const CELL_COLOR: Record<string, string> = { P: '#e8f5e9', HD: '#fff3e0', A: '#ffebee', L: '#f3e5f5', HL: '#fff3e0', H: '#eceff1', WO: '#eceff1', MO: '#ffebee' };

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

  return (
    <>
      <PageHeader title="Monthly register" actions={<Button component={Link} href={`/exports?type=ATTENDANCE_REGISTER&month=${month}`} variant="outlined">Export</Button>} />
      <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <MonthPicker value={month} onChange={(m) => { setMonth(m); setPage(1); }} />
        <NamedSelect label="Branch" value={branchId} onChange={setBranchId} options={branches.data} />
        <NamedSelect label="Department" value={departmentId} onChange={setDepartmentId} options={departments.data} />
        <Typography variant="body2" color="text.secondary">P present · HD half day · A absent · L leave · H holiday · WO weekly off · MO missing out</Typography>
      </Stack>
      {register.isLoading || !data ? <Loading /> : (
        <Paper variant="outlined">
          <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
            <Table size="small" stickyHeader sx={{ '& td, & th': { px: 0.5, fontSize: 12, whiteSpace: 'nowrap' } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ position: 'sticky', left: 0, zIndex: 3, bgcolor: 'background.paper', minWidth: 180 }}>Employee</TableCell>
                  {data.dates.map((d) => <TableCell key={d} align="center">{d.slice(8)}</TableCell>)}
                  <TableCell align="right">P</TableCell><TableCell align="right">HD</TableCell><TableCell align="right">A</TableCell><TableCell align="right">L</TableCell><TableCell align="right">Late</TableCell><TableCell align="right">LOP</TableCell><TableCell align="right">Hours</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={row.employee.id} hover>
                    <TableCell sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.paper' }}><Link href={`/employees/${row.employee.id}`}>{row.employee.fullName}</Link>{row.employee.employeeCode && <Typography component="span" variant="caption" color="text.secondary"> {row.employee.employeeCode}</Typography>}</TableCell>
                    {data.dates.map((d) => <TableCell key={d} align="center" sx={{ bgcolor: CELL_COLOR[row.days[d]] ?? 'transparent' }}>{row.days[d]}</TableCell>)}
                    <TableCell align="right">{row.totals.present}</TableCell><TableCell align="right">{row.totals.halfDay}</TableCell><TableCell align="right">{row.totals.absent}</TableCell><TableCell align="right">{row.totals.leave}</TableCell><TableCell align="right">{row.totals.late}</TableCell><TableCell align="right">{row.totals.lopDays}</TableCell><TableCell align="right">{formatMinutes(row.totals.workedMinutes)}</TableCell>
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
