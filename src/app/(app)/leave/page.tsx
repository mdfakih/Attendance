'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PersonCell } from '@/components/admin/person-cell';
import { REQUEST_FILTERS, REQUEST_STATUS } from '@/components/admin/status';
import { StatusTabs } from '@/components/admin/status-tabs';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable } from '@/components/common/data-table';
import { FeatureGate } from '@/components/common/feature-gate';
import { PageHeader } from '@/components/common/page-header';
import { useSnackbar } from '@/components/common/snackbar';
import { SoftChip } from '@/components/common/status-chip';
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

function dates(r: LeaveRow): string {
  const from = `${formatDate(r.fromDate)}${r.fromPart !== 'FULL' ? ` (${r.fromPart === 'FIRST_HALF' ? '1st half' : '2nd half'})` : ''}`;
  if (r.toDate === r.fromDate) return from;
  return `${from} → ${formatDate(r.toDate)}${r.toPart !== 'FULL' ? ' (1st half)' : ''}`;
}

function LeaveRequests() {
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
  const busyId = (approve.isPending && approve.variables) || (cancel.isPending && cancel.variables) || null;

  const columns: GridColDef<LeaveRow>[] = [
    { field: 'name', headerName: 'Employee', flex: 1, minWidth: 200, valueGetter: (_, r) => r.employee?.fullName ?? '', renderCell: (p) => (p.row.employee ? <PersonCell name={p.row.employee.fullName} href={`/employees/${p.row.employee.id}`} caption={p.row.employee.employeeCode} /> : '—') },
    { field: 'type', headerName: 'Type', width: 150, renderCell: (p) => (p.row.leaveType ? <Stack><Typography variant="body2" sx={{ fontWeight: 600 }}>{p.row.leaveType.name}</Typography><Typography variant="caption" color="text.secondary">{p.row.leaveType.isPaid ? 'Paid' : 'Unpaid'}</Typography></Stack> : '—') },
    { field: 'dates', headerName: 'Dates', width: 230, valueGetter: (_, r) => dates(r) },
    { field: 'days', headerName: 'Days', width: 70, type: 'number' },
    { field: 'reason', headerName: 'Reason', flex: 1, minWidth: 200 },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => { const s = REQUEST_STATUS[p.row.status] ?? { label: p.row.status, tone: 'default' as const }; return <SoftChip label={s.label} tone={s.tone} dot />; } },
    { field: 'createdAt', headerName: 'Requested', width: 170, valueGetter: (_, r) => formatDateTime(r.createdAt) },
    {
      field: 'actions', headerName: '', width: 200, sortable: false,
      renderCell: (p) => can('LEAVE', 'edit') ? (
        <Stack direction="row" spacing={1}>
          {p.row.status === 'PENDING' && <Button size="small" variant="contained" loading={busyId === p.row.id} disabled={!!busyId} onClick={() => approve.mutate(p.row.id)}>Approve</Button>}
          {p.row.status === 'PENDING' && <Button size="small" color="error" disabled={!!busyId} onClick={() => setReject(p.row)}>Reject</Button>}
          {p.row.status === 'APPROVED' && <Button size="small" color="warning" loading={busyId === p.row.id} disabled={!!busyId} onClick={() => cancel.mutate(p.row.id)}>Cancel leave</Button>}
        </Stack>
      ) : null,
    },
  ];

  return (
    <>
      <PageHeader title="Leave requests" subtitle="Approve or reject leave your employees asked for in the app. Approved leave shows on their attendance and pay." />
      <StatusTabs value={status} options={REQUEST_FILTERS} onChange={(v) => { setStatus(v); setPage(1); }} />
      <DataTable
        rows={list.data?.items ?? []}
        columns={columns}
        loading={list.isLoading}
        total={list.data?.meta.total}
        page={page}
        pageSize={pageSize}
        onPageChange={(p, s) => { setPage(p); setPageSize(s); }}
        rowHeight={56}
        emptyText={status === 'PENDING' ? 'No leave requests waiting. You’re all caught up.' : 'No leave requests here.'}
      />
      <ConfirmDialog open={!!reject} title="Reject leave request?" message={`${reject?.employee?.fullName ?? 'The employee'}: ${reject?.days} day(s) from ${reject ? formatDate(reject.fromDate) : ''}. They will see your note in the app.`} confirmLabel="Reject" destructive reasonLabel="Note to employee" busy={rejectMut.isPending} onClose={() => setReject(null)} onConfirm={(note) => reject && rejectMut.mutate({ id: reject.id, note })} />
    </>
  );
}

export default function LeavePage() {
  return (
    <FeatureGate feature="LEAVE">
      <LeaveRequests />
    </FeatureGate>
  );
}
