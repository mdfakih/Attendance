'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { AuthCard } from '@/components/auth/auth-card';
import { authAction, errorMessage } from '@/lib/http';

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await authAction('tenant', 'reset-password', { token, password });
      router.replace('/login');
    } catch (e: unknown) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Choose a new password">
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} helperText="At least 10 characters with letters and numbers" autoFocus />
        <Button variant="contained" size="large" onClick={submit} disabled={busy || password.length < 10}>
          Set password
        </Button>
      </Stack>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
