'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { consoleApi } from '@/lib/http';
import type { PlatformMe } from './types';

export interface ConsoleSession {
  readonly me: PlatformMe;
  /** Onboard and edit clients, their modules and branding. */
  readonly canManage: boolean;
  /** Charges, payments, suspend and reactivate. */
  readonly canBill: boolean;
  /** Create and retire plans. */
  readonly canEditPlans: boolean;
}

const Ctx = createContext<ConsoleSession | null>(null);

export function useConsoleMeQuery() {
  return useQuery({ queryKey: ['console-me'], queryFn: () => consoleApi.get<PlatformMe>('/auth/me'), staleTime: 300_000 });
}

export function ConsoleSessionProvider({ me, children }: { me: PlatformMe; children: ReactNode }) {
  const value: ConsoleSession = {
    me,
    canManage: me.role === 'SUPERADMIN' || me.role === 'SUPPORT',
    canBill: me.role === 'SUPERADMIN' || me.role === 'FINANCE',
    canEditPlans: me.role === 'SUPERADMIN',
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConsoleSession(): ConsoleSession {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useConsoleSession outside ConsoleSessionProvider');
  return ctx;
}

export const PLATFORM_ROLE_LABEL: Readonly<Record<string, string>> = {
  SUPERADMIN: 'Superadmin',
  SUPPORT: 'Support',
  FINANCE: 'Finance',
  READONLY: 'Read only',
};
