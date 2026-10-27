'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { AuthCard } from '@/components/auth/auth-card';
import { ApiError, authAction, errorMessage } from '@/lib/http';

export default function ConsoleLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', totp: '' });
  const [mfa, setMfa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await authAction('platform', 'login', { email: form.email, password: form.password, totp: form.totp || undefined });
      router.replace('/console');
    } catch (e: unknown) {
      if (e instanceof ApiError && e.code === 'MFA_REQUIRED') setMfa(true);
      else setError(errorMessage(e));
      setBusy(false);
    }
  };
  return (
    <AuthCard title="Superadmin console" subtitle="Platform team only">
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoFocus />
        <TextField label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {mfa && <TextField label="Authenticator code" value={form.totp} onChange={(e) => setForm({ ...form, totp: e.target.value })} />}
        <Button variant="contained" size="large" onClick={submit} disabled={busy}>Sign in</Button>
      </Stack>
    </AuthCard>
  );
}
