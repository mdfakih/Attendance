import { describe, expect, it } from 'vitest';
import { FEATURE_KEYS, FEATURE_REGISTRY, PERMISSION_ACTIONS } from '@attendance/contracts';
import { normalizeFeatureViews } from '@/components/console/client-features';
import { moduleCount, toggleCell, toggleRow } from './permission-matrix';

describe('permission matrix helpers', () => {
  it('toggles a single cell on and drops the row once empty', () => {
    const on = toggleCell({}, 'DASHBOARD', 'view');
    expect(on).toEqual({ DASHBOARD: ['view'] });
    expect(toggleCell(on, 'DASHBOARD', 'view')).toEqual({});
  });

  it('switches a whole row on or off without touching other rows', () => {
    const start = { DASHBOARD: ['view' as const] };
    expect(toggleRow(start, 'PAY', true)).toEqual({ DASHBOARD: ['view'], PAY: [...PERMISSION_ACTIONS] });
    expect(toggleRow({ ...start, PAY: ['view' as const] }, 'PAY', false)).toEqual(start);
  });

  it('counts only modules with at least one action', () => {
    expect(moduleCount({ DASHBOARD: ['view'], LEAVE: [], PAY: ['view', 'edit'] })).toBe(2);
  });
});

describe('normalizeFeatureViews', () => {
  it('fills category, labels and locks for an API that predates them', () => {
    const views = normalizeFeatureViews([{ key: 'LEAVE', enabled: true }]);
    expect(views.map((v) => v.key)).toEqual([...FEATURE_KEYS]);
    const leave = views.find((v) => v.key === 'LEAVE');
    expect(leave).toMatchObject({ category: 'MODULE', enabled: true, locked: false, label: FEATURE_REGISTRY.LEAVE.label });
    expect(views.find((v) => v.key === 'EXPORTS')?.enabled).toBe(FEATURE_REGISTRY.EXPORTS.defaultEnabled);
  });

  it('keeps the lock and state the API sends and ignores unknown keys', () => {
    const views = normalizeFeatureViews([{ key: 'LIVE_MAP', enabled: false, locked: true }, { key: 'RETIRED_FEATURE', enabled: true }]);
    expect(views.find((v) => v.key === 'LIVE_MAP')).toMatchObject({ enabled: false, locked: true });
    expect(views).toHaveLength(FEATURE_KEYS.length);
  });
});
