'use client';

import { useState } from 'react';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { tint } from '@/lib/tone';

interface ConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly destructive?: boolean;
  /** When set, the user must type a reason (min 5 chars) before confirming. */
  readonly reasonLabel?: string;
  readonly busy?: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (reason: string) => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', destructive, reasonLabel, busy, onClose, onConfirm }: ConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const needsReason = !!reasonLabel;
  const tone = destructive ? 'error' : 'primary';
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs" slotProps={{ transition: { onEnter: () => setReason('') } }}>
      <DialogContent sx={{ pt: 3 }}>
        <Stack direction="row" spacing={2}>
          <Box sx={(t) => ({ width: 44, height: 44, flexShrink: 0, borderRadius: 3, display: 'grid', placeItems: 'center', color: `${tone}.main`, bgcolor: tint(t, tone, 0.12) })}>
            {destructive ? <WarningAmberOutlinedIcon /> : <HelpOutlineIcon />}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" component="h2">{title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{message}</Typography>
            {needsReason && (
              <TextField
                label={reasonLabel}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                multiline
                minRows={2}
                autoFocus
                helperText="At least 5 characters. Recorded in the audit log."
                sx={{ mt: 2 }}
              />
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          color={tone}
          loading={busy}
          disabled={needsReason && reason.trim().length < 5}
          onClick={() => onConfirm(reason.trim())}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
