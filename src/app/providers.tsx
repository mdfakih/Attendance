'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { DEFAULT_BRANDING, type Branding } from '@attendance/contracts';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from '@/components/common/snackbar';
import { BrandingContext, sameBranding } from '@/lib/branding-context';
import { ApiError } from '@/lib/http';
import { createAppTheme } from '@/lib/theme';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    // A module switched off while the page was open: reload the session so menus and pages catch up.
    const onError = (error: unknown) => {
      if (error instanceof ApiError && error.code === 'FEATURE_DISABLED') void queryClient.invalidateQueries({ queryKey: ['me'] });
    };
    const queryClient: QueryClient = new QueryClient({
      queryCache: new QueryCache({ onError }),
      mutationCache: new MutationCache({ onError }),
      defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } },
    });
    return queryClient;
  });
  const [branding, setBrandingState] = useState<Branding>(DEFAULT_BRANDING);
  const setBranding = useCallback((next: Branding | null) => {
    const target = next ?? DEFAULT_BRANDING;
    setBrandingState((prev) => (sameBranding(prev, target) ? prev : target));
  }, []);
  const brandingApi = useMemo(() => ({ branding, setBranding }), [branding, setBranding]);
  const theme = useMemo(() => createAppTheme(branding), [branding]);
  return (
    <AppRouterCacheProvider>
      <BrandingContext.Provider value={brandingApi}>
        <ThemeProvider theme={theme} defaultMode="system">
          <CssBaseline enableColorScheme />
          <QueryClientProvider client={client}>
            <SnackbarProvider>{children}</SnackbarProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </BrandingContext.Provider>
    </AppRouterCacheProvider>
  );
}
