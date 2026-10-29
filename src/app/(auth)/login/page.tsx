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
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AuthCard } from '@/components/auth/auth-card';
import { PasswordField } from '@/components/auth/password-field';
import { AppLoader } from '@/components/common/app-loader';
import { ApiError, authAction, errorMessage } from '@/lib/http';
import { safeNext } from '@/lib/navigation';

interface Company {
  tenantId: string;
  name: string;
  role: string;
}

type LoginResult = { kind: 'TOKENS' } | { kind: 'SELECT_COMPANY'; selectionToken: string; companies: Company[] };

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [mfa, setMfa] = useState(false);
  const [entering, setEntering] = useState(false);
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const result = await authAction<LoginResult>('tenant', 'login', values);
      // Nothing cached for a previous user on this browser may show for the new one.
      queryClient.clear();
      if (result.kind === 'SELECT_COMPANY') {
        sessionStorage.setItem('company-selection', JSON.stringify(result));
        router.replace('/select-company');
        return;
      }
      setEntering(true);
      router.replace(safeNext(params.get('next'), window.location.origin));
    } catch (e: unknown) {
      if (e instanceof ApiError && e.code === 'MFA_REQUIRED') {
        setMfa(true);
        return;
      }
      setError(errorMessage(e));
    }
  });

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your company dashboard.">
      {entering && <AppLoader label="Opening your dashboard" />}
      <form onSubmit={submit} noValidate>
        <Stack spacing={2.25}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Work email" type="email" autoComplete="email" autoFocus {...form.register('email')} error={!!form.formState.errors.email} helperText={form.formState.errors.email?.message} />
          <PasswordField label="Password" autoComplete="current-password" {...form.register('password')} error={!!form.formState.errors.password} helperText={form.formState.errors.password?.message} />
          {mfa && (
            <TextField label="Authenticator code" inputMode="numeric" autoComplete="one-time-code" autoFocus helperText="Open your authenticator app and enter the 6-digit code." {...form.register('totp')} />
          )}
          <Button type="submit" variant="contained" size="large" loading={form.formState.isSubmitting}>
            Sign in
          </Button>
          <Typography variant="body2" sx={{ textAlign: 'center' }}>
            <Typography component={Link} href="/forgot-password" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
              Forgot your password?
            </Typography>
          </Typography>
        </Stack>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AppLoader label="Loading" />}>
      <LoginForm />
    </Suspense>
  );
}
