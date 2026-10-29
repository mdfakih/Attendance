import { createTenantSchema, DEFAULT_BRANDING, type Branding, type CreateTenantInput } from '@attendance/contracts';

export interface OnboardForm {
  readonly displayName: string;
  readonly slug: string;
  readonly slugTouched: boolean;
  readonly legalName: string;
  readonly gstin: string;
  readonly stateCode: string;
  readonly billingEmail: string;
  readonly planId: string;
  readonly trialDays: string;
  readonly employeeCap: string;
  readonly payrollTier: 'BASIC' | 'FULL';
  readonly adminName: string;
  readonly adminEmail: string;
  readonly branding: Branding;
}

export type OnboardField = Exclude<keyof OnboardForm, 'slugTouched' | 'branding'> | keyof Branding;
export type OnboardErrors = Partial<Record<OnboardField, string>>;

export const EMPTY_ONBOARD: OnboardForm = {
  displayName: '',
  slug: '',
  slugTouched: false,
  legalName: '',
  gstin: '',
  stateCode: 'MH',
  billingEmail: '',
  planId: '',
  trialDays: '14',
  employeeCap: '',
  payrollTier: 'BASIC',
  adminName: '',
  adminEmail: '',
  branding: DEFAULT_BRANDING,
};

export const STEPS = [
  { label: 'Company', fields: ['displayName', 'slug', 'legalName', 'gstin', 'stateCode', 'billingEmail'] },
  { label: 'Plan', fields: ['planId', 'trialDays', 'employeeCap', 'payrollTier'] },
  { label: 'First admin', fields: ['adminName', 'adminEmail'] },
  { label: 'Branding', fields: ['primaryColor', 'accentColor', 'logoUrl'] },
  { label: 'Review', fields: [] },
] as const satisfies ReadonlyArray<{ label: string; fields: readonly OnboardField[] }>;

/** "Acme Industries Pvt Ltd" → "acme-industries-pvt-ltd" (max 40). */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

export function toPayload(f: OnboardForm): Record<string, unknown> {
  return {
    displayName: f.displayName,
    slug: f.slug,
    legalName: f.legalName,
    gstin: f.gstin.trim() || undefined,
    stateCode: f.stateCode,
    billingEmail: f.billingEmail,
    planId: f.planId,
    // An empty box means no trial (the API would otherwise apply its default).
    trialDays: f.trialDays.trim() === '' ? '0' : f.trialDays,
    employeeCap: f.employeeCap.trim() || undefined,
    payrollTier: f.payrollTier,
    admin: { fullName: f.adminName, email: f.adminEmail },
    branding: f.branding,
  };
}

const PATH_TO_FIELD: Readonly<Record<string, OnboardField>> = {
  'admin.fullName': 'adminName',
  'admin.email': 'adminEmail',
  'branding.primaryColor': 'primaryColor',
  'branding.accentColor': 'accentColor',
  'branding.logoUrl': 'logoUrl',
};

/** Plain-language messages; fields with their own schema message (slug, GSTIN, colours, logo) keep it. */
const FRIENDLY: Partial<Record<OnboardField, string>> = {
  displayName: 'Enter the company name (2–80 characters).',
  legalName: 'Enter the registered legal name.',
  billingEmail: 'Enter a valid billing email.',
  stateCode: 'Choose the state.',
  planId: 'Choose a plan.',
  trialDays: 'Use 0 to 90 days.',
  employeeCap: 'Use a number from 1 to 100,000, or leave it empty.',
  adminName: 'Enter the admin’s full name.',
  adminEmail: 'Enter a valid email for the admin.',
};

/** Validates with the API's own schema; returns the parsed body or field errors. */
export function validateOnboard(f: OnboardForm): { ok: true; data: CreateTenantInput } | { ok: false; errors: OnboardErrors } {
  const result = createTenantSchema.safeParse(toPayload(f));
  if (result.success) return { ok: true, data: result.data };
  const errors: OnboardErrors = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    const field = PATH_TO_FIELD[path] ?? (path as OnboardField);
    if (!errors[field]) errors[field] = FRIENDLY[field] ?? issue.message;
  }
  return { ok: false, errors };
}

export function firstStepWithError(errors: OnboardErrors): number {
  const index = STEPS.findIndex((s) => (s.fields as readonly OnboardField[]).some((field) => errors[field]));
  return index === -1 ? STEPS.length - 1 : index;
}
