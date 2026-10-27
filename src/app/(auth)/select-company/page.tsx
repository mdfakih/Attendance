'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { AuthCard } from '@/components/auth/auth-card';
import { authAction, errorMessage } from '@/lib/http';

interface Selection {
  selectionToken: string;
  companies: Array<{ tenantId: string; name: string; role: string }>;
}

export default function SelectCompanyPage() {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('company-selection');
    if (!raw) {
      router.replace('/login');
      return;
    }
    setSelection(JSON.parse(raw) as Selection);
  }, [router]);

  const choose = async (tenantId: string) => {
    if (!selection) return;
    setBusy(true);
    try {
      await authAction('tenant', 'select-company', { selectionToken: selection.selectionToken, tenantId });
      sessionStorage.removeItem('company-selection');
      router.replace('/dashboard');
    } catch (e: unknown) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Choose a company" subtitle="Your account belongs to more than one company">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <List disablePadding>
        {selection?.companies.map((c) => (
          <ListItemButton key={c.tenantId} onClick={() => choose(c.tenantId)} disabled={busy} sx={{ borderRadius: 2 }}>
            <ListItemText primary={c.name} secondary={c.role} />
          </ListItemButton>
        ))}
      </List>
    </AuthCard>
  );
}
