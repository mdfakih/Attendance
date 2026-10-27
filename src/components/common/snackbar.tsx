'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import Alert, { type AlertColor } from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { errorMessage } from '@/lib/http';

interface Toast {
  readonly message: string;
  readonly severity: AlertColor;
}

interface SnackbarApi {
  readonly notify: (message: string, severity?: AlertColor) => void;
  readonly notifyError: (error: unknown) => void;
}

const Ctx = createContext<SnackbarApi | null>(null);

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const notify = useCallback((message: string, severity: AlertColor = 'success') => setToast({ message, severity }), []);
  const notifyError = useCallback((error: unknown) => setToast({ message: errorMessage(error), severity: 'error' }), []);
  const value = useMemo(() => ({ notify, notifyError }), [notify, notifyError]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast?.severity ?? 'info'} variant="filled" onClose={() => setToast(null)}>
          {toast?.message}
        </Alert>
      </Snackbar>
    </Ctx.Provider>
  );
}

export function useSnackbar(): SnackbarApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSnackbar outside SnackbarProvider');
  return ctx;
}
