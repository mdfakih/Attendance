'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@attendance/contracts';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useForm } from 'react-hook-form';
import { AuthCard } from '@/components/auth/auth-card';
import { ApiError, authAction, errorMessage } from '@/lib/http';

interface Company {
  tenantId: string;
  name: string;
  role: string;
}

type LoginResult = { kind: 'TOKENS' } | { kind: 'SELECT_COMPANY'; selectionToken: string; companies: Company[] };

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/dashboard';
  const [error, setError] = useState<string | null>(null);
  const [mfa, setMfa] = useState(false);
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const result = await authAction<LoginResult>('tenant', 'login', values);
      if (result.kind === 'SELECT_COMPANY') {
        sessionStorage.setItem('company-selection', JSON.stringify(result));
        router.replace('/select-company');
        return;
      }
      router.replace(next);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.code === 'MFA_REQUIRED') {
        setMfa(true);
        return;
      }
      setError(errorMessage(e));
    }
  });

  return (
    <AuthCard title="Sign in" subtitle="Employer dashboard">
      <form onSubmit={submit} noValidate>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Email" type="email" autoComplete="email" autoFocus {...form.register('email')} error={!!form.formState.errors.email} helperText={form.formState.errors.email?.message} />
          <TextField label="Password" type="password" autoComplete="current-password" {...form.register('password')} error={!!form.formState.errors.password} helperText={form.formState.errors.password?.message} />
          {mfa && <TextField label="Authenticator code" inputMode="numeric" autoFocus {...form.register('totp')} />}
          <Button type="submit" variant="contained" size="large" disabled={form.formState.isSubmitting}>
            Sign in
          </Button>
          <Typography variant="body2" sx={{ textAlign: 'center' }}>
            <Link href="/forgot-password">Forgot password?</Link>
          </Typography>
        </Stack>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
