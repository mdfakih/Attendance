'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';

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
  const disabled = busy || (needsReason && reason.trim().length < 5);
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: needsReason ? 2 : 0 }}>{message}</DialogContentText>
        {needsReason && (
          <TextField
            label={reasonLabel}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            minRows={2}
            autoFocus
            helperText="Recorded in the audit log"
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" color={destructive ? 'error' : 'primary'} disabled={disabled} onClick={() => onConfirm(reason.trim())}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
