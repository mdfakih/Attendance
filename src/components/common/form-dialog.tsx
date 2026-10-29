'use client';

import type { FormEvent, ReactNode } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

interface FormDialogProps {
  readonly open: boolean;
  readonly title: string;
  /** One line under the title explaining what the form does. */
  readonly subtitle?: ReactNode;
  readonly submitLabel?: string;
  readonly busy?: boolean;
  readonly submitDisabled?: boolean;
  readonly maxWidth?: 'xs' | 'sm' | 'md';
  readonly onClose: () => void;
  readonly onSubmit: () => void;
  readonly children: ReactNode;
}

export function FormDialog({ open, title, subtitle, submitLabel = 'Save', busy, submitDisabled, maxWidth = 'sm', onClose, onSubmit, children }: FormDialogProps) {
  const handle = (e: FormEvent) => {
    e.preventDefault();
    if (!busy) onSubmit();
  };
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth={maxWidth}>
      <form onSubmit={handle} noValidate>
        <DialogTitle component="div" sx={{ pr: 7 }}>
          <Typography variant="h6" component="h2">{title}</Typography>
          {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>{subtitle}</Typography>}
          <IconButton aria-label="Close" onClick={onClose} disabled={busy} sx={{ position: 'absolute', right: 12, top: 14 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1.5 }}>
            {children}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Box sx={{ flex: 1 }} />
          <Button onClick={onClose} disabled={busy} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={busy} disabled={submitDisabled}>
            {submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
