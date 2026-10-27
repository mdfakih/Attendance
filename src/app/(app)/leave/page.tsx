'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { formatDate, formatDateTime } from '@/lib/format';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

interface LeaveRow {
  id: string;
  employee: { id: string; fullName: string; employeeCode: string | null } | null;
  leaveType: { name: string; isPaid: boolean } | null;
  fromDate: string;
  toDate: string;
  fromPart: string;
  toPart: string;
  days: number;
  reason: string;
  status: string;
  createdAt: string;
  decisionNote: string | null;
}

const COLOR: Record<string, 'success' | 'warning' | 'error' | 'default'> = { APPROVED: 'success', PENDING: 'warning', REJECTED: 'error', CANCELLED: 'default' };

export default function LeavePage() {
  const { can } = useSession();
  const { notify, notifyError } = useSnackbar();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [reject, setReject] = useState<LeaveRow | null>(null);
  const params = { status: status || undefined, page, pageSize };
  const list = useQuery({ queryKey: ['leave-requests', params], queryFn: () => api.getPaged<LeaveRow>('/leave/requests', params) });
  const done = (msg: string) => () => { queryClient.invalidateQueries({ queryKey: ['leave-requests'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); setReject(null); notify(msg); };
  const approve = useMutation({ mutationFn: (id: string) => api.post(`/leave/requests/${id}/approve`, {}), onSuccess: done('Leave approved'), onError: notifyError });
  const rejectMut = useMutation({ mutationFn: ({ id, note }: { id: string; note: string }) => api.post(`/leave/requests/${id}/reject`, { note }), onSuccess: done('Leave rejected'), onError: notifyError });
  const cancel = useMutation({ mutationFn: (id: string) => api.post(`/leave/requests/${id}/cancel`), onSuccess: done('Leave cancelled'), onError: notifyError });

  const columns: GridColDef<LeaveRow>[] = [
    { field: 'name', headerName: 'Employee', flex: 1, minWidth: 180, valueGetter: (_, r) => r.employee?.fullName ?? '', renderCell: (p) => (p.row.employee ? <Link href={`/employees/${p.row.employee.id}`}>{p.row.employee.fullName}</Link> : '') },
    { field: 'type', headerName: 'Type', width: 140, valueGetter: (_, r) => r.leaveType?.name ?? '' },
    { field: 'dates', headerName: 'Dates', width: 220, valueGetter: (_, r) => `${formatDate(r.fromDate)}${r.fromPart !== 'FULL' ? ` (${r.fromPart === 'FIRST_HALF' ? '1st half' : '2nd half'})` : ''}${r.toDate !== r.fromDate ? ` → ${formatDate(r.toDate)}${r.toPart !== 'FULL' ? ' (1st half)' : ''}` : ''}` },
    { field: 'days', headerName: 'Days', width: 70 },
    { field: 'reason', headerName: 'Reason', flex: 1, minWidth: 200 },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <Chip size="small" label={p.value} color={COLOR[p.value as string]} variant="outlined" /> },
    { field: 'createdAt', headerName: 'Requested', width: 160, valueGetter: (_, r) => formatDateTime(r.createdAt) },
    { field: 'actions', headerName: '', width: 240, sortable: false, renderCell: (p) => can('LEAVE', 'edit') ? (
      <Stack direction="row" spacing={1}>
        {p.row.status === 'PENDING' && <Button size="small" variant="contained" onClick={() => approve.mutate(p.row.id)}>Approve</Button>}
        {p.row.status === 'PENDING' && <Button size="small" color="error" onClick={() => setReject(p.row)}>Reject</Button>}
        {p.row.status === 'APPROVED' && <Button size="small" color="warning" onClick={() => cancel.mutate(p.row.id)}>Cancel</Button>}
      </Stack>
    ) : null },
  ];

  return (
    <>
      <PageHeader title="Leave requests" />
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <TextField select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} sx={{ minWidth: 160 }}>
          <MenuItem value="">All</MenuItem><MenuItem value="PENDING">Pending</MenuItem><MenuItem value="APPROVED">Approved</MenuItem><MenuItem value="REJECTED">Rejected</MenuItem><MenuItem value="CANCELLED">Cancelled</MenuItem>
        </TextField>
      </Stack>
      <DataTable rows={list.data?.items ?? []} columns={columns} loading={list.isLoading} total={list.data?.meta.total} page={page} pageSize={pageSize} onPageChange={(p, s) => { setPage(p); setPageSize(s); }} />
      <ConfirmDialog open={!!reject} title="Reject leave request?" message={`${reject?.employee?.fullName}: ${reject?.days} day(s) from ${reject ? formatDate(reject.fromDate) : ''}.`} confirmLabel="Reject" destructive reasonLabel="Note to employee" busy={rejectMut.isPending} onClose={() => setReject(null)} onConfirm={(note) => reject && rejectMut.mutate({ id: reject.id, note })} />
    </>
  );
}
