'use client';

import { useState } from 'react';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { MANUAL_MARK_STATUSES } from '@attendance/contracts';
import { useMutation, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { flagLabel } from '@/components/admin/status';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormDialog } from '@/components/common/form-dialog';
import { EmptyState, Loading } from '@/components/common/loading';
import { useSnackbar } from '@/components/common/snackbar';
import { SoftChip, StatusChip } from '@/components/common/status-chip';
import { formatDateTime, formatMinutes, formatOutside, formatTime, STATUS_LABEL } from '@/lib/format';
import { api } from '@/lib/http';
import { useSession } from '@/lib/session';

interface DayDetail {
  day: { status: string; computedStatus: string; statusSource: string; workedMinutes: number; outsideEarlyMinutes: number; outsideLateMinutes: number; outsideMinutes: number; regState: string; regApprovedMinutes: number; lateMinutes: number; isMissingOut: boolean; expectedStartAt: string | null; expectedEndAt: string | null; flags: string[]; periodLocked: boolean } | null;
  punches: Array<{ id: string; serverTime: string; direction: string; site: { name: string } | null; distanceM: number | null; accuracyM: number | null; flags: string[]; selfieUrl: string | null; thumbUrl: string | null; voided: boolean }>;
  manualMarks: Array<{ id: string; action: string; status: string | null; reason: string; previousStatus: string | null; createdAt: string }>;
}

interface DayDetailDialogProps {
  readonly employeeId: string;
  readonly date: string | null;
  readonly onClose: () => void;
  readonly onChanged: () => void;
}

/** One day's punches and manual changes, with "set status manually" for allowed users. */
export function DayDetailDialog({ employeeId, date, onClose, onChanged }: DayDetailDialogProps) {
  const { can, has } = useSession();
  const { notify, notifyError } = useSnackbar();
  const [markOpen, setMarkOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [mark, setMark] = useState({ status: 'PRESENT', reason: '', leaveTypeId: '' });
  const detail = useQuery({ queryKey: ['employee-day', employeeId, date], queryFn: () => api.get<DayDetail>(`/attendance/employees/${employeeId}/days/${date}`), enabled: !!date });
  const leaveTypes = useQuery({ queryKey: ['leave-types'], queryFn: () => api.get<Array<{ id: string; name: string; isPaid: boolean }>>('/leave/types'), enabled: markOpen && has('LEAVE') });
  const markMut = useMutation({
    mutationFn: () => api.post('/attendance/manual-marks', { employeeId, date, status: mark.status, reason: mark.reason, leaveTypeId: mark.leaveTypeId || undefined }),
    onSuccess: () => { onChanged(); setMarkOpen(false); notify('Attendance updated'); },
    onError: notifyError,
  });
  const revokeMut = useMutation({
    mutationFn: (reason: string) => api.post('/attendance/manual-marks/revoke', { employeeId, date, reason }),
    onSuccess: () => { onChanged(); setRevokeOpen(false); notify('Manual mark removed'); },
    onError: notifyError,
  });
  const d = detail.data;

  return (
    <>
      <Dialog open={!!date} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pr: 7 }}>
          {date ? dayjs(date).format('dddd, DD MMM YYYY') : ''}
          <IconButton aria-label="Close" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}><CloseOutlinedIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          {detail.isLoading ? <Loading minHeight={160} /> : d ? (
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                <StatusChip status={d.day?.status ?? 'NOT_STARTED'} size="medium" />
                {d.day?.statusSource === 'MANUAL' && <SoftChip label={`Set manually (was ${STATUS_LABEL[d.day.computedStatus] ?? d.day.computedStatus})`} tone="info" />}
                {d.day?.periodLocked && <SoftChip label="Month locked" />}
              </Stack>
              {d.day && (
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{formatMinutes(d.day.workedMinutes)} worked{d.day.lateMinutes ? ` · ${d.day.lateMinutes} min late` : ''}</Typography>
                  {d.day.outsideMinutes > 0 && <Typography variant="body2" color="warning.main">{formatOutside(d.day.outsideMinutes, d.day.regState, d.day.regApprovedMinutes)}</Typography>}
                </Box>
              )}
              {d.punches.length === 0 ? (
                <EmptyState compact icon={<FingerprintIcon />} title="No punches this day" />
              ) : (
                <Stack spacing={1.25}>
                  {d.punches.map((p) => (
                    <Stack key={p.id} direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 1.25, borderRadius: 3, border: 1, borderColor: 'divider', opacity: p.voided ? 0.5 : 1 }}>
                      {p.thumbUrl ? <Box component="img" src={p.thumbUrl} alt="" sx={{ width: 56, height: 56, borderRadius: 2, objectFit: 'cover', flexShrink: 0 }} /> : <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'action.hover', flexShrink: 0 }} />}
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <SoftChip label={p.direction === 'IN' ? 'In' : 'Out'} tone={p.direction === 'IN' ? 'success' : 'info'} />
                          <Typography sx={{ fontWeight: 700 }}>{formatTime(p.serverTime)}</Typography>
                          {p.voided && <Typography variant="caption" color="text.secondary">voided</Typography>}
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{p.site?.name ?? 'No site'}{p.distanceM !== null ? ` · ${p.distanceM} m away` : ''}{p.accuracyM ? ` · ±${Math.round(p.accuracyM)} m` : ''}</Typography>
                        {p.flags.length > 0 && <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', mt: 0.5 }}>{p.flags.map((f) => <SoftChip key={f} label={flagLabel(f)} tone="warning" />)}</Stack>}
                      </Box>
                      {p.selfieUrl && <Button size="small" href={p.selfieUrl} target="_blank" rel="noreferrer">Selfie</Button>}
                    </Stack>
                  ))}
                </Stack>
              )}
              {d.manualMarks.length > 0 && (
                <Box>
                  <Typography variant="overline" color="text.secondary">Manual changes</Typography>
                  {d.manualMarks.map((m) => (
                    <Typography key={m.id} variant="body2" sx={{ mt: 0.5 }}>{formatDateTime(m.createdAt)} — {m.action === 'SET' ? `set to ${STATUS_LABEL[m.status ?? ''] ?? m.status}` : 'manual mark removed'}: {m.reason}</Typography>
                  ))}
                </Box>
              )}
              {can('ATTENDANCE_MANUAL', 'create') && !d.day?.periodLocked && (
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" onClick={() => setMarkOpen(true)}>Set status manually</Button>
                  {d.day?.statusSource === 'MANUAL' && can('ATTENDANCE_MANUAL', 'delete') && (
                    <Button color="warning" onClick={() => setRevokeOpen(true)}>Remove manual mark</Button>
                  )}
                </Stack>
              )}
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>

      <FormDialog open={markOpen} title="Set attendance manually" subtitle={date ? dayjs(date).format('dddd, DD MMM YYYY') : undefined} busy={markMut.isPending} onClose={() => setMarkOpen(false)} onSubmit={() => markMut.mutate()} maxWidth="xs">
        <TextField select label="Status" value={mark.status} onChange={(e) => setMark({ ...mark, status: e.target.value })}>
          {MANUAL_MARK_STATUSES.filter((s) => s !== 'LEAVE' || !has('LEAVE')).map((s) => <MenuItem key={s} value={s}>{STATUS_LABEL[s] ?? s}</MenuItem>)}
        </TextField>
        {mark.status === 'LEAVE' && has('LEAVE') && (
          <TextField select label="Leave type" value={mark.leaveTypeId} onChange={(e) => setMark({ ...mark, leaveTypeId: e.target.value })}>
            {(leaveTypes.data ?? []).map((t) => <MenuItem key={t.id} value={t.id}>{t.name} ({t.isPaid ? 'paid' : 'unpaid'})</MenuItem>)}
          </TextField>
        )}
        <TextField label="Reason" value={mark.reason} onChange={(e) => setMark({ ...mark, reason: e.target.value })} multiline minRows={2} helperText="Required · recorded in the audit log" />
      </FormDialog>
      <ConfirmDialog
        open={revokeOpen}
        title="Remove the manual mark?"
        message="The day goes back to the status worked out from punches."
        confirmLabel="Remove"
        destructive
        reasonLabel="Reason"
        busy={revokeMut.isPending}
        onClose={() => setRevokeOpen(false)}
        onConfirm={(reason) => revokeMut.mutate(reason)}
      />
    </>
  );
}
