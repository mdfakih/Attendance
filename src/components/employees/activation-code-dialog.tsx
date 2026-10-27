'use client';

import { useRef } from 'react';
import PrintIcon from '@mui/icons-material/Print';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { QRCodeSVG } from 'qrcode.react';
import { formatDateTime } from '@/lib/format';

export interface IssuedCode {
  code: string;
  formatted: string;
  expiresAt: string;
}

interface Props {
  readonly open: boolean;
  readonly employeeName: string;
  readonly phone: string;
  readonly code: IssuedCode | null;
  readonly onClose: () => void;
}

/** Shows a one-time activation code with a QR the employee can scan in the app. */
export function ActivationCodeDialog({ open, employeeName, phone, code, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const print = () => {
    const w = window.open('', '_blank', 'width=420,height=560');
    if (!w || !cardRef.current) return;
    w.document.write(`<html><body style="font-family:sans-serif;text-align:center;padding:24px">${cardRef.current.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Activation code</DialogTitle>
      <DialogContent>
        {code ? (
          <Box ref={cardRef} sx={{ textAlign: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{employeeName}</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>{phone}</Typography>
            <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
              <QRCodeSVG value={code.code} size={180} />
            </Box>
            <Typography variant="h4" sx={{ fontFamily: 'monospace', letterSpacing: 4 }}>{code.formatted}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Enter in the attendance app with your mobile number. Single use · valid until {formatDateTime(code.expiresAt)}
            </Typography>
          </Box>
        ) : (
          <Typography color="text.secondary">No live code. Generate a new one to show it here.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        {code && (
          <Button startIcon={<PrintIcon />} onClick={print}>
            Print card
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} variant="contained">Done</Button>
      </DialogActions>
    </Dialog>
  );
}
