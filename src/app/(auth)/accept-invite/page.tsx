'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { acceptInviteSchema, type AcceptInviteInput } from '@attendance/contracts';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { AuthCard } from '@/components/auth/auth-card';
import { authAction, errorMessage } from '@/lib/http';

interface InviteInfo {
  email: string;
  fullName: string;
  companyName: string;
  hasAccount: boolean;
}

function AcceptInviteForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<AcceptInviteInput>({ resolver: zodResolver(acceptInviteSchema), defaultValues: { token, fullName: '', password: '' } });

  useEffect(() => {
    axios
      .get(`/api/t/auth/invitation`, { params: { token }, validateStatus: () => true })
      .then((res) => {
        if (!res.data?.success) throw new Error(res.data?.error?.message ?? 'Invalid invitation');
        setInfo(res.data.data as InviteInfo);
        form.setValue('fullName', (res.data.data as InviteInfo).fullName);
      })
      .catch((e: unknown) => setError(errorMessage(e)));
  }, [token, form]);

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await authAction('tenant', 'accept-invite', values);
      router.replace('/dashboard');
    } catch (e: unknown) {
      setError(errorMessage(e));
    }
  });

  return (
    <AuthCard title={info ? `Join ${info.companyName}` : 'Accept invitation'} subtitle={info ? `Signing up as ${info.email}` : undefined}>
      <form onSubmit={submit} noValidate>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Your name" {...form.register('fullName')} error={!!form.formState.errors.fullName} helperText={form.formState.errors.fullName?.message} disabled={info?.hasAccount} />
          <TextField
            label={info?.hasAccount ? 'Your existing password' : 'Create a password'}
            type="password"
            autoComplete={info?.hasAccount ? 'current-password' : 'new-password'}
            {...form.register('password')}
            error={!!form.formState.errors.password}
            helperText={form.formState.errors.password?.message ?? (info?.hasAccount ? 'This email already has an account; confirm its password.' : 'At least 10 characters with letters and numbers')}
          />
          <Button type="submit" variant="contained" size="large" disabled={!info || form.formState.isSubmitting}>
            Continue
          </Button>
        </Stack>
      </form>
    </AuthCard>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  );
}
