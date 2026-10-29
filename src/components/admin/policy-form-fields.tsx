'use client';

import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

export interface PolicyForm {
  id?: string;
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
  outsideMinMinutes: number;
  maxPunchesPerDay: number;
}

function Num({ label, value, onChange, help }: { label: string; value: number | null; onChange: (v: number | null) => void; help?: string }) {
  return <TextField type="number" label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} helperText={help} />;
}

function Group({ children }: { children: string }) {
  return <Typography variant="overline" color="text.secondary" component="div" sx={{ pt: 0.5 }}>{children}</Typography>;
}

/** Fields of an attendance policy, grouped by what they control. */
export function PolicyFormFields({ value: p, onChange }: { value: PolicyForm; onChange: (next: PolicyForm) => void }) {
  const set = (patch: Partial<PolicyForm>) => onChange({ ...p, ...patch });
  return (
    <>
      <TextField label="Name" value={p.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
      <Group>Hours & day status</Group>
      <TextField select label="How hours are counted" value={p.hoursMode} onChange={(e) => set({ hoursMode: e.target.value })}>
        <MenuItem value="FIRST_IN_LAST_OUT">First punch to last punch (minus unpaid break)</MenuItem>
        <MenuItem value="SUM_OF_PAIRS">Sum of each in/out pair</MenuItem>
      </TextField>
      <Stack direction="row" spacing={1}>
        <Num label="Late grace (min)" value={p.lateGraceMin} onChange={(v) => set({ lateGraceMin: v ?? 0 })} />
        <Num label="Early-leave grace (min)" value={p.earlyLeaveGraceMin} onChange={(v) => set({ earlyLeaveGraceMin: v ?? 0 })} />
      </Stack>
      <Stack direction="row" spacing={1}>
        <Num label="Full day needs (min)" value={p.fullDayMinMinutes} onChange={(v) => set({ fullDayMinMinutes: v })} help="Blank = shift duty hours" />
        <Num label="Half day needs (min)" value={p.halfDayMinMinutes} onChange={(v) => set({ halfDayMinMinutes: v ?? 0 })} />
      </Stack>
      <TextField select label="Missing out-punch counts as" value={p.missingOutTreatment} onChange={(e) => set({ missingOutTreatment: e.target.value })}>
        <MenuItem value="ABSENT">Absent</MenuItem>
        <MenuItem value="HALF_DAY">Half day</MenuItem>
        <MenuItem value="PRESENT_FLAGGED">Present (flagged)</MenuItem>
      </TextField>
      <Group>Punching</Group>
      <Stack direction="row" spacing={1}>
        <Num label="Min gap between punches (sec)" value={p.minPunchGapSec} onChange={(v) => set({ minPunchGapSec: v ?? 0 })} />
        <Num label="Max punches per day" value={p.maxPunchesPerDay} onChange={(v) => set({ maxPunchesPerDay: v ?? 0 })} help="2–20" />
      </Stack>
      <TextField select label="Fake GPS apps" value={p.blockMockLocation ? 'block' : 'flag'} onChange={(e) => set({ blockMockLocation: e.target.value === 'block' })}>
        <MenuItem value="block">Block the punch</MenuItem>
        <MenuItem value="flag">Allow but flag it</MenuItem>
      </TextField>
      <Group>Time outside working hours</Group>
      <TextField select label="Time outside working hours needs approval" value={p.otRequiresApproval ? 'yes' : 'no'} onChange={(e) => set({ otRequiresApproval: e.target.value === 'yes' })} helperText="Approved time first completes the day; the rest is overtime">
        <MenuItem value="yes">Yes, employee asks and a manager approves</MenuItem>
        <MenuItem value="no">No, counted automatically</MenuItem>
      </TextField>
      <Num label="Ignore outside time shorter than (min)" value={p.outsideMinMinutes} onChange={(v) => set({ outsideMinMinutes: v ?? 0 })} help="Checked separately before the start and after the end" />
      <Group>Overtime (when the Overtime module is on)</Group>
      <Stack direction="row" spacing={1}>
        <Num label="Minimum (min)" value={p.otMinMinutes} onChange={(v) => set({ otMinMinutes: v ?? 0 })} />
        <Num label="Round down to (min)" value={p.otRoundingMinutes} onChange={(v) => set({ otRoundingMinutes: v ?? 1 })} />
        <Num label="Daily cap (min)" value={p.otDailyCapMinutes} onChange={(v) => set({ otDailyCapMinutes: v ?? 0 })} />
      </Stack>
    </>
  );
}
