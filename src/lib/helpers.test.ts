import { describe, expect, it } from 'vitest';
import { DEFAULT_BRANDING } from '@attendance/contracts';
import { activeHref } from '@/components/shell/nav-match';
import { EMPTY_ONBOARD, firstStepWithError, slugify, validateOnboard, type OnboardForm } from '@/components/console/onboard-form';
import { initials, pageTitle, PRODUCT } from './brand';
import { safeNext } from './navigation';
import { balanceDue } from '@/components/console/money';

describe('balanceDue', () => {
  it.each([
    ['1000.00', '398.93', '601.07'],
    ['1000.00', '797.85', '202.15'],
    ['5900.00', '0.00', '5900.00'],
    ['100.00', '150.00', '0.00'],
  ])('%s − %s = %s', (total, amountPaid, expected) => {
    expect(balanceDue({ total, amountPaid })).toBe(expected);
  });
});

describe('safeNext', () => {
  const origin = 'https://app.example.com';

  it.each([
    ['/employees?status=ACTIVE', '/employees?status=ACTIVE'],
    ['/console/tenants/abc#billing', '/console/tenants/abc#billing'],
    [null, '/dashboard'],
    ['', '/dashboard'],
    ['https://evil.com', '/dashboard'],
    ['//evil.com', '/dashboard'],
    ['/\\evil.com', '/dashboard'],
    ['/\t/evil.com', '/dashboard'],
    ['javascript:alert(1)', '/dashboard'],
  ])('%s → %s', (raw, expected) => {
    expect(safeNext(raw, origin)).toBe(expected);
  });
});

describe('initials', () => {
  it.each([
    ['Acme Industries', 'AI'],
    ['acme', 'AC'],
    ['  Tata   Consultancy Services ', 'TC'],
    ['', '?'],
  ])('%s → %s', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });

  it('names the product KamaiGo, matching its two-part wordmark', () => {
    expect(PRODUCT.name).toBe('KamaiGo');
    expect(`${PRODUCT.wordmark.base}${PRODUCT.wordmark.accent}`).toBe(PRODUCT.name);
    expect(PRODUCT.consoleName).toBe('KamaiGo Console');
  });

  it('builds document titles with the product name', () => {
    expect(pageTitle('Clients')).toBe(`Clients · ${PRODUCT.name}`);
    expect(pageTitle()).toBe(PRODUCT.name);
  });
});

describe('activeHref', () => {
  const hrefs = ['/dashboard', '/employees', '/employees/import', '/console', '/console/tenants'];

  it('prefers the most specific match', () => {
    expect(activeHref('/employees/import', hrefs)).toBe('/employees/import');
    expect(activeHref('/employees/123', hrefs)).toBe('/employees');
    expect(activeHref('/console/tenants/abc', hrefs)).toBe('/console/tenants');
    expect(activeHref('/console', hrefs)).toBe('/console');
  });

  it('does not match on a shared prefix that is not a path segment', () => {
    expect(activeHref('/employeesx', hrefs)).toBeNull();
  });
});

describe('onboarding form', () => {
  const valid: OnboardForm = {
    ...EMPTY_ONBOARD,
    displayName: 'Acme Industries',
    slug: 'acme-industries',
    legalName: 'Acme Industries Private Limited',
    billingEmail: 'accounts@acme.example.com',
    planId: '0192f0b4-6c1e-7a00-8000-000000000001',
    adminName: 'Priya Sharma',
    adminEmail: 'priya@acme.example.com',
  };

  it('slugifies company names within 40 characters', () => {
    expect(slugify('Acme Industries Pvt. Ltd.')).toBe('acme-industries-pvt-ltd');
    expect(slugify('  ---Hello---  ')).toBe('hello');
    expect(slugify('a'.repeat(39) + ' b').length).toBeLessThanOrEqual(40);
    expect(slugify('a'.repeat(39) + ' b').endsWith('-')).toBe(false);
  });

  it('accepts a complete form and keeps the chosen branding', () => {
    const result = validateOnboard(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.branding).toEqual(DEFAULT_BRANDING);
      expect(result.data.gstin).toBeUndefined();
      expect(result.data.employeeCap).toBeUndefined();
    }
  });

  it('maps errors to friendly field messages and to the first failing step', () => {
    const result = validateOnboard({ ...valid, adminEmail: 'nope', planId: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.adminEmail).toMatch(/valid email/);
      expect(result.errors.planId).toBe('Choose a plan.');
      expect(firstStepWithError(result.errors)).toBe(1);
    }
  });

  it('flags a bad logo link on the branding step', () => {
    const result = validateOnboard({ ...valid, branding: { ...DEFAULT_BRANDING, logoUrl: 'http://x.example.com/logo.png' } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(firstStepWithError(result.errors)).toBe(3);
  });
});
