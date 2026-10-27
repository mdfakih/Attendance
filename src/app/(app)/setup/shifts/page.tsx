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
import { Loading } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

interface Shift {
  id: string;
  name: string;
  code: string | null;
  startTime: string;
  endTime: string;
  dutyMinutes: number;
  unpaidBreakMinutes: number;
  isFlexible: boolean;
  windowBeforeStartMin: number;
  windowAfterEndMin: number;
  policyId: string | null;
  active: boolean;
}

interface Policy {
  id: string;
  name: string;
  hoursMode: string;
  lateGraceMin: number;
  earlyLeaveGraceMin: number;
  fullDayMinMinutes: number | null;
  halfDayMinMinutes: number;
  missingOutTreatment: string;
  minPunchGapSec: number;
  blockMockLocation: boolean;
  otMinMinutes: number;
  otRoundingMinutes: number;
  otDailyCapMinutes: number;
  otRequiresApproval: boolean;
}

type ShiftForm = Omit<Shift, 'id' | 'code' | 'policyId'> & { id?: string; code: string; policyId: string };
type PolicyForm = Omit<Policy, 'id'> & { id?: string };

const emptyShift: ShiftForm = { name: '', code: '', startTime: '09:00', endTime: '18:00', dutyMinutes: 480, unpaidBreakMinutes: 60, isFlexible: false, windowBeforeStartMin: 120, windowAfterEndMin: 360, policyId: '', active: true };
const emptyPolicy: PolicyForm = { name: '', hoursMode: 'FIRST_IN_LAST_OUT', lateGraceMin: 10, earlyLeaveGraceMin: 10, fullDayMinMinutes: null, halfDayMinMinutes: 240, missingOutTreatment: 'ABSENT', minPunchGapSec: 60, blockMockLocation: true, otMinMinutes: 30, otRoundingMinutes: 15, otDailyCapMinutes: 240, otRequiresApproval: true };

function Num({ label, value, onChange, help }: { label: string; value: number | null; onChange: (v: number | null) => void; help?: string }) {
  return <TextField type="number" label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} helperText={help} />;
}

export default function ShiftsPage() {
  const { can } = useSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [shiftForm, setShiftForm] = useState<ShiftForm | null>(null);
  const [policyForm, setPolicyForm] = useState<PolicyForm | null>(null);
  const shifts = useQuery({ queryKey: ['shifts'], queryFn: () => api.get<Shift[]>('/shifts') });
  const policies = useQuery({ queryKey: ['policies'], queryFn: () => api.get<Policy[]>('/policies') });
  const invalidate = () => { queryClient.invalidateQueries({ queryKey: ['shifts'] }); queryClient.invalidateQueries({ queryKey: ['policies'] }); };
  const saveShift = useMutation({
    mutationFn: (f: ShiftForm) => { const body = { ...f, id: undefined, code: f.code || undefined, policyId: f.policyId || null }; return f.id ? api.put(`/shifts/${f.id}`, body) : api.post('/shifts', body); },
    onSuccess: () => { invalidate(); setShiftForm(null); notify('Shift saved'); },
    onError: notifyError,
  });
  const savePolicy = useMutation({
    mutationFn: (f: PolicyForm) => { const body = { ...f, id: undefined }; return f.id ? api.put(`/policies/${f.id}`, body) : api.post('/policies', body); },
    onSuccess: () => { invalidate(); setPolicyForm(null); notify('Policy saved. Recent attendance is being recalculated.'); },
    onError: notifyError,
  });
  const editable = can('SHIFTS', 'edit');

  return (
    <>
      <PageHeader title="Shifts & attendance policies" subtitle="A shift sets the working hours; a policy sets how punches turn into present, half day, late and overtime." />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card><CardContent>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">Shifts</Typography>
              {can('SHIFTS', 'create') && <Button size="small" startIcon={<AddIcon />} onClick={() => setShiftForm(emptyShift)}>Add</Button>}
            </Stack>
            {shifts.isLoading ? <Loading minHeight={80} /> : (
              <Table size="small">
                <TableHead><TableRow><TableCell>Shift</TableCell><TableCell>Timing</TableCell><TableCell align="right">Duty</TableCell><TableCell /></TableRow></TableHead>
                <TableBody>
                  {shifts.data?.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.name}{!s.active && ' (inactive)'}{s.isFlexible && <Typography component="span" variant="caption" color="text.secondary"> flexible</Typography>}</TableCell>
                      <TableCell>{s.startTime}–{s.endTime}{s.endTime <= s.startTime && ' (overnight)'}</TableCell>
                      <TableCell align="right">{(s.dutyMinutes / 60).toFixed(1)} h</TableCell>
                      <TableCell align="right">{editable && <Button size="small" onClick={() => setShiftForm({ ...s, code: s.code ?? '', policyId: s.policyId ?? '' })}>Edit</Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card><CardContent>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">Attendance policies</Typography>
              {can('SHIFTS', 'create') && <Button size="small" startIcon={<AddIcon />} onClick={() => setPolicyForm(emptyPolicy)}>Add</Button>}
            </Stack>
            {policies.isLoading ? <Loading minHeight={80} /> : (
              <Table size="small">
                <TableHead><TableRow><TableCell>Policy</TableCell><TableCell>Hours</TableCell><TableCell>Grace</TableCell><TableCell>Half day</TableCell><TableCell /></TableRow></TableHead>
                <TableBody>
                  {policies.data?.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>{p.hoursMode === 'FIRST_IN_LAST_OUT' ? 'First in → last out' : 'Sum of in/out pairs'}</TableCell>
                      <TableCell>{p.lateGraceMin} min</TableCell>
                      <TableCell>≥ {(p.halfDayMinMinutes / 60).toFixed(1)} h</TableCell>
                      <TableCell align="right">{editable && <Button size="small" onClick={() => setPolicyForm(p)}>Edit</Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </Grid>
      </Grid>

      <FormDialog open={!!shiftForm} title={shiftForm?.id ? 'Edit shift' : 'Add shift'} busy={saveShift.isPending} onClose={() => setShiftForm(null)} onSubmit={() => shiftForm && saveShift.mutate(shiftForm)}>
        {shiftForm && (
          <>
            <Stack direction="row" spacing={1}>
              <TextField label="Name" value={shiftForm.name} onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })} autoFocus />
              <TextField label="Code" value={shiftForm.code} onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value })} sx={{ maxWidth: 120 }} />
            </Stack>
            <Stack direction="row" spacing={1}>
              <TextField type="time" label="Start" value={shiftForm.startTime} onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField type="time" label="End" value={shiftForm.endTime} onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} helperText={shiftForm.endTime <= shiftForm.startTime ? 'Ends next day (overnight)' : ''} />
            </Stack>
            <Stack direction="row" spacing={1}>
              <Num label="Duty minutes" value={shiftForm.dutyMinutes} onChange={(v) => setShiftForm({ ...shiftForm, dutyMinutes: v ?? 0 })} help="480 = 8 hours" />
              <Num label="Unpaid break (min)" value={shiftForm.unpaidBreakMinutes} onChange={(v) => setShiftForm({ ...shiftForm, unpaidBreakMinutes: v ?? 0 })} />
            </Stack>
            <Stack direction="row" spacing={1}>
              <Num label="Window before start (min)" value={shiftForm.windowBeforeStartMin} onChange={(v) => setShiftForm({ ...shiftForm, windowBeforeStartMin: v ?? 0 })} help="How early a punch still counts for this shift" />
              <Num label="Window after end (min)" value={shiftForm.windowAfterEndMin} onChange={(v) => setShiftForm({ ...shiftForm, windowAfterEndMin: v ?? 0 })} />
            </Stack>
            <TextField select label="Flexible timing" value={shiftForm.isFlexible ? 'yes' : 'no'} onChange={(e) => setShiftForm({ ...shiftForm, isFlexible: e.target.value === 'yes' })} helperText="Flexible shifts never mark late / early leave"><MenuItem value="no">No</MenuItem><MenuItem value="yes">Yes</MenuItem></TextField>
            <TextField select label="Policy" value={shiftForm.policyId} onChange={(e) => setShiftForm({ ...shiftForm, policyId: e.target.value })}><MenuItem value="">Company default</MenuItem>{policies.data?.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}</TextField>
            <TextField select label="Status" value={shiftForm.active ? 'yes' : 'no'} onChange={(e) => setShiftForm({ ...shiftForm, active: e.target.value === 'yes' })}><MenuItem value="yes">Active</MenuItem><MenuItem value="no">Inactive</MenuItem></TextField>
          </>
        )}
      </FormDialog>

      <FormDialog open={!!policyForm} title={policyForm?.id ? 'Edit policy' : 'Add policy'} busy={savePolicy.isPending} onClose={() => setPolicyForm(null)} onSubmit={() => policyForm && savePolicy.mutate(policyForm)}>
        {policyForm && (
          <>
            <TextField label="Name" value={policyForm.name} onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })} autoFocus />
            <TextField select label="How hours are counted" value={policyForm.hoursMode} onChange={(e) => setPolicyForm({ ...policyForm, hoursMode: e.target.value })}>
              <MenuItem value="FIRST_IN_LAST_OUT">First punch to last punch (minus unpaid break)</MenuItem>
              <MenuItem value="SUM_OF_PAIRS">Sum of each in/out pair</MenuItem>
            </TextField>
            <Stack direction="row" spacing={1}>
              <Num label="Late grace (min)" value={policyForm.lateGraceMin} onChange={(v) => setPolicyForm({ ...policyForm, lateGraceMin: v ?? 0 })} />
              <Num label="Early-leave grace (min)" value={policyForm.earlyLeaveGraceMin} onChange={(v) => setPolicyForm({ ...policyForm, earlyLeaveGraceMin: v ?? 0 })} />
            </Stack>
            <Stack direction="row" spacing={1}>
              <Num label="Full day needs (min)" value={policyForm.fullDayMinMinutes} onChange={(v) => setPolicyForm({ ...policyForm, fullDayMinMinutes: v })} help="Blank = shift duty hours" />
              <Num label="Half day needs (min)" value={policyForm.halfDayMinMinutes} onChange={(v) => setPolicyForm({ ...policyForm, halfDayMinMinutes: v ?? 0 })} />
            </Stack>
            <TextField select label="Missing out-punch counts as" value={policyForm.missingOutTreatment} onChange={(e) => setPolicyForm({ ...policyForm, missingOutTreatment: e.target.value })}>
              <MenuItem value="ABSENT">Absent</MenuItem><MenuItem value="HALF_DAY">Half day</MenuItem><MenuItem value="PRESENT_FLAGGED">Present (flagged)</MenuItem>
            </TextField>
            <Stack direction="row" spacing={1}>
              <Num label="Min gap between punches (sec)" value={policyForm.minPunchGapSec} onChange={(v) => setPolicyForm({ ...policyForm, minPunchGapSec: v ?? 0 })} />
              <TextField select label="Fake GPS apps" value={policyForm.blockMockLocation ? 'block' : 'flag'} onChange={(e) => setPolicyForm({ ...policyForm, blockMockLocation: e.target.value === 'block' })}><MenuItem value="block">Block punch</MenuItem><MenuItem value="flag">Allow but flag</MenuItem></TextField>
            </Stack>
            <Typography variant="overline" color="text.secondary">Overtime (when the Overtime feature is on)</Typography>
            <Stack direction="row" spacing={1}>
              <Num label="Minimum (min)" value={policyForm.otMinMinutes} onChange={(v) => setPolicyForm({ ...policyForm, otMinMinutes: v ?? 0 })} />
              <Num label="Round down to (min)" value={policyForm.otRoundingMinutes} onChange={(v) => setPolicyForm({ ...policyForm, otRoundingMinutes: v ?? 1 })} />
              <Num label="Daily cap (min)" value={policyForm.otDailyCapMinutes} onChange={(v) => setPolicyForm({ ...policyForm, otDailyCapMinutes: v ?? 0 })} />
            </Stack>
            <TextField select label="Overtime approval" value={policyForm.otRequiresApproval ? 'yes' : 'no'} onChange={(e) => setPolicyForm({ ...policyForm, otRequiresApproval: e.target.value === 'yes' })}><MenuItem value="yes">Manager must approve</MenuItem><MenuItem value="no">Auto-approved</MenuItem></TextField>
          </>
        )}
      </FormDialog>
    </>
  );
}
