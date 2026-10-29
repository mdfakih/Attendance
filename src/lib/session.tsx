'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Branding, FeatureState, PermissionAction, PermissionModule, PermissionSet, RoleKind } from '@attendance/contracts';
import { hasPermission, resolveBranding, resolveFeatures } from '@attendance/contracts';
import { useQuery } from '@tanstack/react-query';
import { api } from './http';

/** Fills in branding and newer feature keys so an older API never breaks the dashboard. */
function normalizeSession(raw: TenantSession): TenantSession {
  return {
    ...raw,
    tenant: { ...raw.tenant, branding: resolveBranding(raw.tenant.branding) },
    features: { ...resolveFeatures([]), ...raw.features },
  };
}

export interface TenantSession {
  readonly user: { id: string; email: string; fullName: string };
  readonly membershipId: string;
  readonly role: { id: string; name: string; kind: RoleKind };
  readonly permissions: PermissionSet;
  readonly scopes: { branchIds: string[]; departmentIds: string[] };
  readonly tenant: { id: string; displayName: string; legalName: string; timezone: string; status: string; payrollTier: string; stateCode: string; branding: Branding };
  readonly features: FeatureState;
  readonly settings: Record<string, unknown> | null;
}

interface SessionApi {
  readonly session: TenantSession;
  readonly isAdmin: boolean;
  readonly can: (module: PermissionModule, action?: PermissionAction) => boolean;
  readonly has: (feature: keyof FeatureState) => boolean;
  readonly refresh: () => void;
}

const Ctx = createContext<SessionApi | null>(null);

export function useSessionQuery() {
  return useQuery({ queryKey: ['me'], queryFn: async () => normalizeSession(await api.get<TenantSession>('/me')), staleTime: 60_000, refetchOnWindowFocus: true });
}

export function SessionProvider({ session, refresh, children }: { session: TenantSession; refresh: () => void; children: ReactNode }) {
  const isAdmin = session.role.kind === 'ADMIN';
  const value: SessionApi = {
    session,
    isAdmin,
    can: (module, action = 'view') => isAdmin || hasPermission(session.permissions, module, action),
    has: (feature) => session.features[feature],
    refresh,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession outside SessionProvider');
  return ctx;
}
