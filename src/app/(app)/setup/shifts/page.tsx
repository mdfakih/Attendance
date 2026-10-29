'use client';

import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PolicyFormFields, type PolicyForm } from '@/components/admin/policy-form-fields';
import { FormDialog } from '@/components/common/form-dialog';
import { EmptyState, Loading } from '@/components/common/loading';
import { PageHeader } from '@/components/common/page-header';
import { SectionCard } from '@/components/common/section-card';
import { useSnackbar } from '@/components/common/snackbar';
import { SoftChip } from '@/components/common/status-chip';
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

type Policy = PolicyForm & { id: string };
type ShiftForm = Omit<Shift, 'id' | 'code' | 'policyId'> & { id?: string; code: string; policyId: string };

const emptyShift: ShiftForm = { name: '', code: '', startTime: '09:00', endTime: '18:00', dutyMinutes: 480, unpaidBreakMinutes: 60, isFlexible: false, windowBeforeStartMin: 120, windowAfterEndMin: 360, policyId: '', active: true };
const emptyPolicy: PolicyForm = { name: '', hoursMode: 'FIRST_IN_LAST_OUT', lateGraceMin: 10, earlyLeaveGraceMin: 10, fullDayMinMinutes: null, halfDayMinMinutes: 240, missingOutTreatment: 'ABSENT', minPunchGapSec: 60, blockMockLocation: true, otMinMinutes: 30, otRoundingMinutes: 15, otDailyCapMinutes: 240, otRequiresApproval: true, outsideMinMinutes: 15, maxPunchesPerDay: 6 };

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
      <PageHeader title="Shifts & attendance policies" subtitle="A shift sets the working hours; a policy decides how punches turn into present, half day, late and overtime." />
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title="Shifts" subtitle="Working hours employees are expected to keep." icon={<ScheduleOutlinedIcon />} flush action={can('SHIFTS', 'create') ? <Button size="small" startIcon={<AddIcon />} onClick={() => setShiftForm(emptyShift)}>Add shift</Button> : undefined}>
            {shifts.isLoading ? <Box sx={{ p: 2.5 }}><Loading minHeight={120} /></Box> : (shifts.data?.length ?? 0) === 0 ? <EmptyState compact icon={<ScheduleOutlinedIcon />} title="No shifts yet" /> : (
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow><TableCell sx={{ pl: 2.5 }}>Shift</TableCell><TableCell>Timing</TableCell><TableCell align="right">Duty</TableCell><TableCell sx={{ pr: 2.5 }} /></TableRow></TableHead>
                  <TableBody>
                    {shifts.data?.map((s) => (
                      <TableRow key={s.id} hover>
                        <TableCell sx={{ pl: 2.5 }}>
                          <Stack direction="row" spacing={0.75} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.name}</Typography>
                            {s.isFlexible && <SoftChip label="Flexible" tone="info" />}
                            {!s.active && <SoftChip label="Inactive" />}
                          </Stack>
                        </TableCell>
                        <TableCell>{s.startTime}–{s.endTime}{s.endTime <= s.startTime && <Typography component="span" variant="caption" color="text.secondary"> overnight</Typography>}</TableCell>
                        <TableCell align="right">{(s.dutyMinutes / 60).toFixed(1)} h</TableCell>
                        <TableCell align="right" sx={{ pr: 2.5 }}>{editable && <Button size="small" onClick={() => setShiftForm({ ...s, code: s.code ?? '', policyId: s.policyId ?? '' })}>Edit</Button>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title="Attendance policies" subtitle="Grace periods, half-day rules and overtime." icon={<RuleOutlinedIcon />} flush action={can('SHIFTS', 'create') ? <Button size="small" startIcon={<AddIcon />} onClick={() => setPolicyForm(emptyPolicy)}>Add policy</Button> : undefined}>
            {policies.isLoading ? <Box sx={{ p: 2.5 }}><Loading minHeight={120} /></Box> : (policies.data?.length ?? 0) === 0 ? <EmptyState compact icon={<RuleOutlinedIcon />} title="No policies yet" /> : (
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow><TableCell sx={{ pl: 2.5 }}>Policy</TableCell><TableCell>Hours</TableCell><TableCell>Grace</TableCell><TableCell>Half day</TableCell><TableCell sx={{ pr: 2.5 }} /></TableRow></TableHead>
                  <TableBody>
                    {policies.data?.map((p) => (
                      <TableRow key={p.id} hover>
                        <TableCell sx={{ pl: 2.5, fontWeight: 600 }}>{p.name}</TableCell>
                        <TableCell>{p.hoursMode === 'FIRST_IN_LAST_OUT' ? 'First in → last out' : 'Sum of in/out pairs'}</TableCell>
                        <TableCell>{p.lateGraceMin} min</TableCell>
                        <TableCell>≥ {(p.halfDayMinMinutes / 60).toFixed(1)} h</TableCell>
                        <TableCell align="right" sx={{ pr: 2.5 }}>{editable && <Button size="small" onClick={() => setPolicyForm(p)}>Edit</Button>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      <FormDialog open={!!shiftForm} title={shiftForm?.id ? 'Edit shift' : 'Add shift'} subtitle="Set when the shift starts and ends, and how long the duty is." busy={saveShift.isPending} onClose={() => setShiftForm(null)} onSubmit={() => shiftForm && saveShift.mutate(shiftForm)}>
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

      <FormDialog open={!!policyForm} title={policyForm?.id ? 'Edit policy' : 'Add policy'} subtitle="Changes recalculate recent attendance automatically." busy={savePolicy.isPending} onClose={() => setPolicyForm(null)} onSubmit={() => policyForm && savePolicy.mutate(policyForm)}>
        {policyForm && <PolicyFormFields value={policyForm} onChange={setPolicyForm} />}
      </FormDialog>
    </>
  );
}
