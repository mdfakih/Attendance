'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import ListItemButton from '@mui/material/ListItemButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { AuthCard } from '@/components/auth/auth-card';
import { TenantAvatar } from '@/components/brand/tenant-avatar';
import { AppLoader } from '@/components/common/app-loader';
import { authAction, errorMessage } from '@/lib/http';

interface Selection {
  selectionToken: string;
  companies: Array<{ tenantId: string; name: string; role: string }>;
}

const STORAGE_KEY = 'company-selection';
const noSubscribe = () => () => undefined;

/** The pending choice saved by the login page; undefined until the browser has rendered. */
function useStoredSelection(): string | null | undefined {
  return useSyncExternalStore(noSubscribe, () => sessionStorage.getItem(STORAGE_KEY), () => undefined);
}

export default function SelectCompanyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const raw = useStoredSelection();
  const selection = useMemo(() => (raw ? (JSON.parse(raw) as Selection) : null), [raw]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (raw === null && !busy) router.replace('/login');
  }, [raw, busy, router]);

  const choose = async (tenantId: string) => {
    if (!selection) return;
    setBusy(tenantId);
    setError(null);
    try {
      await authAction('tenant', 'select-company', { selectionToken: selection.selectionToken, tenantId });
      sessionStorage.removeItem(STORAGE_KEY);
      queryClient.clear();
      router.replace('/dashboard');
    } catch (e: unknown) {
      setError(errorMessage(e));
      setBusy(null);
    }
  };

  if (!selection) return <AppLoader label="Loading your companies" />;
  return (
    <AuthCard title="Choose a company" subtitle="Your account belongs to more than one company. Pick where to go.">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack spacing={1}>
        {selection.companies.map((c) => (
          <ListItemButton
            key={c.tenantId}
            onClick={() => choose(c.tenantId)}
            disabled={!!busy}
            sx={{ border: 1, borderColor: 'divider', borderRadius: 3, py: 1.25, gap: 1.5, bgcolor: 'background.paper', '&:hover': { borderColor: 'primary.main' } }}
          >
            <TenantAvatar name={c.name} size={40} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }} noWrap>{c.name}</Typography>
              <Typography variant="body2" color="text.secondary">{c.role}</Typography>
            </Box>
            {busy === c.tenantId ? <CircularProgress size={20} /> : <ChevronRightIcon color="action" />}
          </ListItemButton>
        ))}
      </Stack>
    </AuthCard>
  );
}
