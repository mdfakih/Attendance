'use client';

import { useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AuthCard } from '@/components/auth/auth-card';
import { authAction, errorMessage } from '@/lib/http';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await authAction('tenant', 'forgot-password', { email });
      setDone(true);
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Reset your password" subtitle="We will email you a reset link if the address has an account.">
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        {done ? (
          <Alert severity="success">If that email has an account, a reset link is on its way.</Alert>
        ) : (
          <>
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            <Button variant="contained" size="large" onClick={submit} disabled={!email} loading={busy}>
              Send reset link
            </Button>
          </>
        )}
        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          <Typography component={Link} href="/login" variant="body2" color="primary" sx={{ fontWeight: 600 }}>Back to sign in</Typography>
        </Typography>
      </Stack>
    </AuthCard>
  );
}
