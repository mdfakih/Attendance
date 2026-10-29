'use client';

import { useState } from 'react';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import WhereToVoteOutlinedIcon from '@mui/icons-material/WhereToVoteOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useShifts } from '@/components/common/filters';
import { SectionCard } from '@/components/common/section-card';
import { useSnackbar } from '@/components/common/snackbar';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

export interface CompanySettings {
  payableDaysBasis: string;
  defaultOtMultiplier: string;
  activationCodeTtlDays: number;
  defaultSiteRadiusM: number;
  defaultMaxAccuracyM: number;
  accuracyBufferCapM: number;
  selfieRetentionDays: number;
  missingOutReminder: boolean;
  defaultShiftId: string | null;
}

const n = (v: string) => Number(v);

/** Attendance, location and pay settings; seeded once from the loaded values. */
export function SettingsForm({ initial }: { initial: CompanySettings }) {
  const { can, refresh } = useSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const shifts = useShifts();
  const [form, setForm] = useState<CompanySettings>(initial);
  const canEdit = can('SETTINGS', 'edit');
  const canPay = can('PAY', 'edit');
  const save = useMutation({
    mutationFn: async (f: CompanySettings) => {
      await api.patch('/settings', { activationCodeTtlDays: f.activationCodeTtlDays, defaultSiteRadiusM: f.defaultSiteRadiusM, defaultMaxAccuracyM: f.defaultMaxAccuracyM, accuracyBufferCapM: f.accuracyBufferCapM, selfieRetentionDays: f.selfieRetentionDays, missingOutReminder: f.missingOutReminder, defaultShiftId: f.defaultShiftId });
      if (canPay) await api.put('/settings/pay', { payableDaysBasis: f.payableDaysBasis, defaultOtMultiplier: Number(f.defaultOtMultiplier) });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings'] }); refresh(); notify('Settings saved'); },
    onError: notifyError,
  });
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  return (
    <Stack spacing={2.5}>
      <SectionCard title="Attendance & location" subtitle="How punches are checked and how long data is kept." icon={<WhereToVoteOutlinedIcon />}>
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField select label="Company working hours" value={shifts.data ? (form.defaultShiftId ?? '') : ''} onChange={(e) => setForm({ ...form, defaultShiftId: e.target.value || null })} disabled={!shifts.data || !canEdit} helperText="Applies to everyone unless their branch or the employee has its own shift. Time punched outside these hours counts only once approved.">
              <MenuItem value="">None</MenuItem>
              {shifts.data?.map((s) => <MenuItem key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField type="number" label="Default site radius (m)" value={form.defaultSiteRadiusM} onChange={(e) => setForm({ ...form, defaultSiteRadiusM: n(e.target.value) })} disabled={!canEdit} helperText="For new sites" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField type="number" label="Max GPS error (m)" value={form.defaultMaxAccuracyM} onChange={(e) => setForm({ ...form, defaultMaxAccuracyM: n(e.target.value) })} disabled={!canEdit} helperText="Less accurate punches are refused" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField type="number" label="GPS tolerance cap (m)" value={form.accuracyBufferCapM} onChange={(e) => setForm({ ...form, accuracyBufferCapM: n(e.target.value) })} disabled={!canEdit} helperText="Extra distance allowed for GPS error" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField type="number" label="Activation code validity (days)" value={form.activationCodeTtlDays} onChange={(e) => setForm({ ...form, activationCodeTtlDays: n(e.target.value) })} disabled={!canEdit} helperText="1–30 days" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField type="number" label="Keep selfies for (days)" value={form.selfieRetentionDays} onChange={(e) => setForm({ ...form, selfieRetentionDays: n(e.target.value) })} disabled={!canEdit} helperText="30–365; deleted automatically afterwards" />
          </Grid>
          <Grid size={12}>
            <TextField select label="Remind employees who forget to punch out" value={form.missingOutReminder ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, missingOutReminder: e.target.value === 'yes' })} disabled={!canEdit}>
              <MenuItem value="yes">Yes, 30 minutes after shift end</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="Pay" subtitle={canPay ? 'How monthly salary turns into daily pay.' : 'Only users who can edit pay can change these.'} icon={<PaymentsOutlinedIcon />}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 7 }}>
            <TextField select label="Monthly salary divided by" value={form.payableDaysBasis} onChange={(e) => setForm({ ...form, payableDaysBasis: e.target.value })} disabled={!canPay}>
              <MenuItem value="CALENDAR">Calendar days in the month</MenuItem>
              <MenuItem value="FIXED_26">Fixed 26 days</MenuItem>
              <MenuItem value="FIXED_30">Fixed 30 days</MenuItem>
              <MenuItem value="WORKING_DAYS">Working days in the month</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField type="number" label="Default overtime multiplier" value={form.defaultOtMultiplier} onChange={(e) => setForm({ ...form, defaultOtMultiplier: e.target.value })} disabled={!canPay} helperText="e.g. 1.5 or 2" />
          </Grid>
        </Grid>
      </SectionCard>

      {canEdit && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
          {dirty && <Typography variant="body2" color="text.secondary">You have unsaved changes</Typography>}
          <Box>
            {dirty && <Button color="inherit" onClick={() => setForm(initial)} disabled={save.isPending} sx={{ mr: 1 }}>Discard</Button>}
            <Button variant="contained" onClick={() => save.mutate(form)} loading={save.isPending} disabled={!dirty}>Save settings</Button>
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
