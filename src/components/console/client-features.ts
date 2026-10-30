'use client';

import { FEATURE_KEYS, FEATURE_REGISTRY, type FeatureKey, type FeatureView } from '@attendance/contracts';
import { useQuery } from '@tanstack/react-query';
import { consoleApi } from '@/lib/http';

/** A feature row as an API of any version sends it; keys it no longer knows are ignored. */
type RawFeature = Omit<Partial<FeatureView>, 'key'> & { readonly key: string };

/**
 * One row per known feature, in registry order, with label, category and requirements from the registry.
 * An API that predates module categories or locks still yields a complete, usable list.
 */
export function normalizeFeatureViews(rows: readonly RawFeature[]): FeatureView[] {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return FEATURE_KEYS.map((key) => {
    const row = byKey.get(key);
    const def = FEATURE_REGISTRY[key];
    return { ...def, enabled: row?.enabled ?? def.defaultEnabled, locked: row?.locked ?? false };
  });
}

export function clientFeaturesKey(tenantId: string): readonly unknown[] {
  return ['console-tenant-features', tenantId];
}

/** A client's modules and options as the platform team sees them. */
export function useClientFeatures(tenantId: string) {
  return useQuery({
    queryKey: clientFeaturesKey(tenantId),
    queryFn: async () => normalizeFeatureViews(await consoleApi.get<RawFeature[]>(`/tenants/${tenantId}/features`)),
  });
}

/** Switches a client's module or option and/or locks it; returns the full, normalised list. */
export async function saveClientFeature(
  tenantId: string,
  input: { key: FeatureKey; enabled?: boolean; locked?: boolean },
): Promise<FeatureView[]> {
  return normalizeFeatureViews(await consoleApi.put<RawFeature[]>(`/tenants/${tenantId}/features`, input));
}
