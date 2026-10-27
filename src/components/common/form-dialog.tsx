'use client';

import type { FormEvent, ReactNode } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';

interface FormDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly submitLabel?: string;
  readonly busy?: boolean;
  readonly maxWidth?: 'xs' | 'sm' | 'md';
  readonly onClose: () => void;
  readonly onSubmit: () => void;
  readonly children: ReactNode;
}

export function FormDialog({ open, title, submitLabel = 'Save', busy, maxWidth = 'sm', onClose, onSubmit, children }: FormDialogProps) {
  const handle = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth={maxWidth}>
      <form onSubmit={handle} noValidate>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {children}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
