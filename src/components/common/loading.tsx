import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { errorMessage } from '@/lib/http';

export function Loading({ minHeight = 160 }: { minHeight?: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight }}>
      <CircularProgress size={28} />
    </Box>
  );
}

export function ErrorAlert({ error }: { error: unknown }) {
  return <Alert severity="error">{errorMessage(error)}</Alert>;
}

export function Empty({ text }: { text: string }) {
  return <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>{text}</Box>;
}
