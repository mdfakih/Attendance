'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useQueryClient } from '@tanstack/react-query';
import { AuthCard } from '@/components/auth/auth-card';
import { PasswordField } from '@/components/auth/password-field';
import { AppLoader } from '@/components/common/app-loader';
import { ApiError, authAction, errorMessage } from '@/lib/http';

export default function ConsoleLoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ email: '', password: '', totp: '' });
  const [mfa, setMfa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [entering, setEntering] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authAction('platform', 'login', { email: form.email, password: form.password, totp: form.totp || undefined });
      queryClient.clear();
      setEntering(true);
      router.replace('/console');
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'MFA_REQUIRED') setMfa(true);
      else setError(errorMessage(err));
      setBusy(false);
    }
  };
  return (
    <AuthCard variant="console" title="Platform console" subtitle="For the platform team only. Sign in to manage clients.">
      {entering && <AppLoader label="Opening the console" />}
      <form onSubmit={submit} noValidate>
        <Stack spacing={2.25}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoFocus />
          <PasswordField label="Password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {mfa && (
            <TextField label="Authenticator code" inputMode="numeric" autoComplete="one-time-code" autoFocus value={form.totp} onChange={(e) => setForm({ ...form, totp: e.target.value })} helperText="Enter the 6-digit code from your authenticator app." />
          )}
          <Button type="submit" variant="contained" size="large" loading={busy} disabled={!form.email || !form.password}>
            Sign in
          </Button>
        </Stack>
      </form>
    </AuthCard>
  );
}
