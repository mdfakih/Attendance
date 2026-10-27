'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { employeeCreateSchema, SALARY_BASES, type EmployeeCreateInput } from '@attendance/contracts';
import type { z } from 'zod';

type FormValues = z.input<typeof employeeCreateSchema>;
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { FormDialog } from '@/components/common/form-dialog';
import { useBranches, useDepartments, useShifts, useSites } from '@/components/common/filters';
import { todayIso } from '@/lib/format';
import { useSession } from '@/lib/session';

interface Props {
  readonly open: boolean;
  readonly busy?: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (values: EmployeeCreateInput) => void;
}

export function EmployeeCreateDialog({ open, busy, onClose, onSubmit }: Props) {
  const { can } = useSession();
  const branches = useBranches();
  const departments = useDepartments();
  const sites = useSites();
  const shifts = useShifts();
  const form = useForm<FormValues, unknown, EmployeeCreateInput>({
    resolver: zodResolver(employeeCreateSchema),
    defaultValues: { fullName: '', phone: '', branchId: '', dateOfJoining: todayIso(), siteIds: [], geofenceMode: 'ASSIGNED_SITES' },
  });
  const withSalary = form.watch('salary') !== undefined;
  const err = form.formState.errors;
  return (
    <FormDialog open={open} title="Add employee" submitLabel="Create & get activation code" busy={busy} onClose={onClose} onSubmit={form.handleSubmit(onSubmit)} maxWidth="md">
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}><TextField label="Full name" {...form.register('fullName')} error={!!err.fullName} helperText={err.fullName?.message} autoFocus /></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><TextField label="Mobile number" {...form.register('phone')} error={!!err.phone} helperText={err.phone?.message ?? 'Used to sign in to the app'} /></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><TextField label="Employee code (optional)" {...form.register('employeeCode')} /></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><TextField label="Email (optional)" type="email" {...form.register('email')} error={!!err.email} helperText={err.email?.message} /></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><TextField label="Designation (optional)" {...form.register('designation')} /></Grid>
        <Grid size={{ xs: 12, sm: 6 }}><TextField type="date" label="Date of joining" {...form.register('dateOfJoining')} slotProps={{ inputLabel: { shrink: true } }} error={!!err.dateOfJoining} helperText={err.dateOfJoining?.message} /></Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller name="branchId" control={form.control} render={({ field }) => (
            <TextField select label="Branch" {...field} error={!!err.branchId} helperText={err.branchId?.message} required>
              {(branches.data ?? []).map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </TextField>
          )} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller name="departmentId" control={form.control} render={({ field }) => (
            <TextField select label="Department" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)}>
              <MenuItem value="">None</MenuItem>
              {(departments.data ?? []).map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
            </TextField>
          )} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller name="shiftId" control={form.control} render={({ field }) => (
            <TextField select label="Shift" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} helperText="Leave empty to use the branch default">
              <MenuItem value="">Branch default</MenuItem>
              {(shifts.data ?? []).map((s) => <MenuItem key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</MenuItem>)}
            </TextField>
          )} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller name="siteIds" control={form.control} render={({ field }) => (
            <Autocomplete
              multiple
              options={sites.data ?? []}
              getOptionLabel={(o) => o.name}
              value={(sites.data ?? []).filter((s) => (field.value ?? []).includes(s.id))}
              onChange={(_, v) => field.onChange(v.map((s) => s.id))}
              renderInput={(params) => <TextField {...params} label="Work sites (geofence)" helperText="Employee can punch only inside these" />}
            />
          )} />
        </Grid>
        {can('EMPLOYEE_SALARY', 'edit') && (
          <>
            <Grid size={12}>
              <FormControlLabel control={<Checkbox checked={withSalary} onChange={(e) => form.setValue('salary', e.target.checked ? { basis: 'MONTHLY', amount: '', effectiveFrom: form.getValues('dateOfJoining') } : undefined)} />} label={<Typography>Set salary now</Typography>} />
            </Grid>
            {withSalary && (
              <>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Controller name="salary.basis" control={form.control} render={({ field }) => (
                    <TextField select label="Basis" {...field}>
                      {SALARY_BASES.map((b) => <MenuItem key={b} value={b}>{b === 'MONTHLY' ? 'Per month' : b === 'WEEKLY' ? 'Per week' : 'Per hour'}</MenuItem>)}
                    </TextField>
                  )} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}><TextField label="Amount (₹)" {...form.register('salary.amount')} error={!!err.salary?.amount} helperText={err.salary?.amount?.message} /></Grid>
                <Grid size={{ xs: 12, sm: 4 }}><TextField type="date" label="Effective from" {...form.register('salary.effectiveFrom')} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
              </>
            )}
          </>
        )}
      </Grid>
    </FormDialog>
  );
}
