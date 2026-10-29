'use client';

import { createContext, useContext, useEffect } from 'react';
import { DEFAULT_BRANDING, type Branding } from '@attendance/contracts';

export interface BrandingApi {
  readonly branding: Branding;
  /** null restores the product's own colours. */
  readonly setBranding: (branding: Branding | null) => void;
}

export const BrandingContext = createContext<BrandingApi>({ branding: DEFAULT_BRANDING, setBranding: () => undefined });

export function sameBranding(a: Branding, b: Branding): boolean {
  return a.primaryColor === b.primaryColor && a.accentColor === b.accentColor && a.logoUrl === b.logoUrl;
}

export function useBranding(): BrandingApi {
  return useContext(BrandingContext);
}

/** Applies a client's colours while the calling layout is mounted. */
export function useApplyBranding(branding: Branding | undefined): void {
  const { setBranding } = useBranding();
  const primary = branding?.primaryColor;
  const accent = branding?.accentColor;
  const logo = branding?.logoUrl ?? null;
  useEffect(() => {
    if (!primary || !accent) return undefined;
    setBranding({ primaryColor: primary, accentColor: accent, logoUrl: logo });
    return () => setBranding(null);
  }, [primary, accent, logo, setBranding]);
}
