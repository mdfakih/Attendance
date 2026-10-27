'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/common/data-table';
import { FormDialog } from '@/components/common/form-dialog';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { formatDate, formatMinutes } from '@/lib/format';
import { api } from '@/lib/http';

interface PendingOt {
  employee: { id: string; fullName: string; employeeCode: string | null };
  date: string;
  workedMinutes: number;
  otMinutes: number;
}

export default function OvertimePage() {
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [edit, setEdit] = useState<PendingOt | null>(null);
  const [minutes, setMinutes] = useState('');
  const list = useQuery({ queryKey: ['overtime-pending'], queryFn: () => api.get<PendingOt[]>('/attendance/overtime/pending') });
  const decide = useMutation({
    mutationFn: (v: { employeeId: string; date: string; approvedMinutes: number }) => api.post('/attendance/overtime/decisions', v),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['overtime-pending'] }); setEdit(null); notify('Overtime decided'); },
    onError: notifyError,
  });
  const columns: GridColDef<PendingOt>[] = [
    { field: 'name', headerName: 'Employee', flex: 1, minWidth: 200, valueGetter: (_, r) => r.employee.fullName, renderCell: (p) => <Link href={`/employees/${p.row.employee.id}`}>{p.row.employee.fullName}</Link> },
    { field: 'date', headerName: 'Date', width: 130, valueGetter: (_, r) => formatDate(r.date) },
    { field: 'workedMinutes', headerName: 'Worked', width: 100, valueGetter: (_, r) => formatMinutes(r.workedMinutes) },
    { field: 'otMinutes', headerName: 'Overtime', width: 100, valueGetter: (_, r) => formatMinutes(r.otMinutes) },
    { field: 'actions', headerName: '', width: 260, sortable: false, renderCell: (p) => (
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="contained" onClick={() => decide.mutate({ employeeId: p.row.employee.id, date: p.row.date, approvedMinutes: p.row.otMinutes })}>Approve all</Button>
        <Button size="small" onClick={() => { setEdit(p.row); setMinutes(String(p.row.otMinutes)); }}>Partial</Button>
        <Button size="small" color="error" onClick={() => decide.mutate({ employeeId: p.row.employee.id, date: p.row.date, approvedMinutes: 0 })}>Reject</Button>
      </Stack>
    ) },
  ];
  return (
    <>
      <PageHeader title="Overtime approvals" subtitle="Only approved minutes are paid." />
      <DataTable rows={list.data ?? []} columns={columns} getRowId={(r) => `${r.employee.id}-${r.date}`} loading={list.isLoading} />
      <FormDialog open={!!edit} title="Approve part of the overtime" busy={decide.isPending} onClose={() => setEdit(null)} onSubmit={() => edit && decide.mutate({ employeeId: edit.employee.id, date: edit.date, approvedMinutes: Number(minutes) })} maxWidth="xs">
        <TextField label="Approved minutes" type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} helperText={edit ? `Computed overtime: ${edit.otMinutes} minutes` : ''} />
      </FormDialog>
    </>
  );
}
