'use client';

import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
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
import { FormDialog } from '@/components/common/form-dialog';
import { useShifts } from '@/components/common/filters';
import { Loading } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

interface Branch {
  id: string;
  name: string;
  code: string | null;
  stateCode: string;
  address: string | null;
  holidayCalendarId: string | null;
  weeklyOffPatternId: string | null;
  defaultShiftId: string | null;
  active: boolean;
  _count: { employees: number };
}

interface Department {
  id: string;
  name: string;
  code: string | null;
  active: boolean;
}

const STATES = ['AN', 'AP', 'AR', 'AS', 'BR', 'CH', 'CT', 'DL', 'DN', 'GA', 'GJ', 'HP', 'HR', 'JH', 'JK', 'KA', 'KL', 'LA', 'LD', 'MH', 'ML', 'MN', 'MP', 'MZ', 'NL', 'OR', 'PB', 'PY', 'RJ', 'SK', 'TG', 'TN', 'TR', 'UP', 'UT', 'WB'];

const emptyBranch = { name: '', code: '', stateCode: 'MH', address: '', holidayCalendarId: '', weeklyOffPatternId: '', defaultShiftId: '', active: true };

export default function OrgPage() {
  const { can } = useSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [branchForm, setBranchForm] = useState<(typeof emptyBranch & { id?: string }) | null>(null);
  const [deptForm, setDeptForm] = useState<{ id?: string; name: string; code: string; active: boolean } | null>(null);
  const branches = useQuery({ queryKey: ['branches'], queryFn: () => api.get<Branch[]>('/branches') });
  const departments = useQuery({ queryKey: ['departments'], queryFn: () => api.get<Department[]>('/departments') });
  const calendars = useQuery({ queryKey: ['calendars'], queryFn: () => api.get<Array<{ id: string; name: string }>>('/calendars') });
  const patterns = useQuery({ queryKey: ['weekly-offs'], queryFn: () => api.get<Array<{ id: string; name: string }>>('/weekly-offs') });
  const shifts = useShifts();
  const invalidate = () => { queryClient.invalidateQueries({ queryKey: ['branches'] }); queryClient.invalidateQueries({ queryKey: ['departments'] }); };
  const saveBranch = useMutation({
    mutationFn: (f: typeof emptyBranch & { id?: string }) => {
      const body = { ...f, code: f.code || undefined, address: f.address || undefined, holidayCalendarId: f.holidayCalendarId || null, weeklyOffPatternId: f.weeklyOffPatternId || null, defaultShiftId: f.defaultShiftId || null, id: undefined };
      return f.id ? api.put(`/branches/${f.id}`, body) : api.post('/branches', body);
    },
    onSuccess: () => { invalidate(); setBranchForm(null); notify('Branch saved'); },
    onError: notifyError,
  });
  const saveDept = useMutation({
    mutationFn: (f: { id?: string; name: string; code: string; active: boolean }) => (f.id ? api.put(`/departments/${f.id}`, { name: f.name, code: f.code || undefined, active: f.active }) : api.post('/departments', { name: f.name, code: f.code || undefined, active: f.active })),
    onSuccess: () => { invalidate(); setDeptForm(null); notify('Department saved'); },
    onError: notifyError,
  });
  const editable = can('SETTINGS', 'edit');

  return (
    <>
      <PageHeader title="Branches & departments" subtitle="Branches carry the holiday calendar, weekly-off pattern and default shift for their employees." />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card><CardContent>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">Branches</Typography>
              {can('SETTINGS', 'create') && <Button size="small" startIcon={<AddIcon />} onClick={() => setBranchForm(emptyBranch)}>Add</Button>}
            </Stack>
            {branches.isLoading ? <Loading minHeight={80} /> : (
              <Table size="small">
                <TableHead><TableRow><TableCell>Name</TableCell><TableCell>State</TableCell><TableCell align="right">Employees</TableCell><TableCell>Default shift</TableCell><TableCell /></TableRow></TableHead>
                <TableBody>
                  {branches.data?.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{b.name}{b.code && <Typography component="span" variant="caption" color="text.secondary"> {b.code}</Typography>}{!b.active && ' (inactive)'}</TableCell>
                      <TableCell>{b.stateCode}</TableCell>
                      <TableCell align="right">{b._count.employees}</TableCell>
                      <TableCell>{shifts.data?.find((s) => s.id === b.defaultShiftId)?.name ?? '—'}</TableCell>
                      <TableCell align="right">{editable && <Button size="small" onClick={() => setBranchForm({ ...emptyBranch, ...b, code: b.code ?? '', address: b.address ?? '', holidayCalendarId: b.holidayCalendarId ?? '', weeklyOffPatternId: b.weeklyOffPatternId ?? '', defaultShiftId: b.defaultShiftId ?? '' })}>Edit</Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card><CardContent>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">Departments</Typography>
              {can('SETTINGS', 'create') && <Button size="small" startIcon={<AddIcon />} onClick={() => setDeptForm({ name: '', code: '', active: true })}>Add</Button>}
            </Stack>
            {departments.isLoading ? <Loading minHeight={80} /> : (departments.data?.length ?? 0) === 0 ? <Typography color="text.secondary" variant="body2">Optional. Add departments to filter and scope managers.</Typography> : (
              <Table size="small">
                <TableBody>
                  {departments.data?.map((d) => (
                    <TableRow key={d.id}><TableCell>{d.name}{!d.active && ' (inactive)'}</TableCell><TableCell align="right">{editable && <Button size="small" onClick={() => setDeptForm({ id: d.id, name: d.name, code: d.code ?? '', active: d.active })}>Edit</Button>}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </Grid>
      </Grid>

      <FormDialog open={!!branchForm} title={branchForm?.id ? 'Edit branch' : 'Add branch'} busy={saveBranch.isPending} onClose={() => setBranchForm(null)} onSubmit={() => branchForm && saveBranch.mutate(branchForm)}>
        {branchForm && (
          <>
            <TextField label="Name" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} autoFocus />
            <Stack direction="row" spacing={1}>
              <TextField label="Code (optional)" value={branchForm.code} onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })} />
              <TextField select label="State" value={branchForm.stateCode} onChange={(e) => setBranchForm({ ...branchForm, stateCode: e.target.value })} sx={{ minWidth: 120 }}>{STATES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField>
            </Stack>
            <TextField label="Address (optional)" value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} />
            <TextField select label="Holiday calendar" value={branchForm.holidayCalendarId} onChange={(e) => setBranchForm({ ...branchForm, holidayCalendarId: e.target.value })}><MenuItem value="">Company default</MenuItem>{calendars.data?.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</TextField>
            <TextField select label="Weekly-off pattern" value={branchForm.weeklyOffPatternId} onChange={(e) => setBranchForm({ ...branchForm, weeklyOffPatternId: e.target.value })}><MenuItem value="">Company default</MenuItem>{patterns.data?.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}</TextField>
            <TextField select label="Default shift" value={branchForm.defaultShiftId} onChange={(e) => setBranchForm({ ...branchForm, defaultShiftId: e.target.value })}><MenuItem value="">None (calendar day)</MenuItem>{shifts.data?.map((s) => <MenuItem key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</MenuItem>)}</TextField>
            <TextField select label="Status" value={branchForm.active ? 'yes' : 'no'} onChange={(e) => setBranchForm({ ...branchForm, active: e.target.value === 'yes' })}><MenuItem value="yes">Active</MenuItem><MenuItem value="no">Inactive</MenuItem></TextField>
          </>
        )}
      </FormDialog>
      <FormDialog open={!!deptForm} title={deptForm?.id ? 'Edit department' : 'Add department'} busy={saveDept.isPending} onClose={() => setDeptForm(null)} onSubmit={() => deptForm && saveDept.mutate(deptForm)} maxWidth="xs">
        {deptForm && (
          <>
            <TextField label="Name" value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} autoFocus />
            <TextField label="Code (optional)" value={deptForm.code} onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })} />
            <TextField select label="Status" value={deptForm.active ? 'yes' : 'no'} onChange={(e) => setDeptForm({ ...deptForm, active: e.target.value === 'yes' })}><MenuItem value="yes">Active</MenuItem><MenuItem value="no">Inactive</MenuItem></TextField>
          </>
        )}
      </FormDialog>
    </>
  );
}
