import type { Branding, FeatureView, PlatformRole } from '@attendance/contracts';
import type { ToneOrNeutral } from '@/lib/tone';

export interface PlatformMe {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly role: PlatformRole;
  readonly mfaEnabled: boolean;
}

export interface TenantRow {
  readonly id: string;
  readonly slug: string;
  readonly displayName: string;
  readonly legalName: string;
  readonly status: string;
  readonly payrollTier: string;
  readonly employeeCap: number | null;
  readonly branding?: Branding;
  readonly employees: number;
  readonly plan: string | null;
  readonly subscriptionStatus: string | null;
  readonly currentPeriodEnd: string | null;
  readonly createdAt: string;
}

export interface Charge {
  readonly id: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly billableEmployees: number;
  readonly total: string;
  readonly amountPaid: string;
  readonly status: string;
  readonly dueDate: string | null;
  readonly invoiceNo: string | null;
}

export interface Payment {
  readonly id: string;
  readonly amount: string;
  readonly method: string;
  readonly referenceNo: string | null;
  readonly receivedOn: string | null;
  readonly status: string;
}

export interface Subscription {
  readonly id: string;
  readonly planId: string;
  readonly planName: string;
  readonly status: string;
  readonly currentPeriodStart: string | null;
  readonly currentPeriodEnd: string | null;
  readonly nextDueDate: string | null;
  readonly trialEndsAt: string | null;
  readonly pricePerEmployee: string | null;
  readonly priceOverride: string | null;
  readonly notes: string | null;
}

export interface TenantDetail {
  readonly id: string;
  readonly slug: string;
  readonly displayName: string;
  readonly legalName: string;
  readonly gstin: string | null;
  readonly stateCode: string;
  readonly billingEmail: string;
  readonly timezone: string;
  readonly status: string;
  readonly statusReason: string | null;
  readonly payrollTier: string;
  readonly employeeCap: number | null;
  readonly branding?: Branding;
  readonly createdAt: string;
  readonly employees: { readonly active: number; readonly invited: number };
  readonly admins: ReadonlyArray<{ email: string; fullName: string; lastLoginAt: string | null }>;
  readonly pendingInvites: ReadonlyArray<{ id: string; email: string; fullName: string; expiresAt: string }>;
  readonly subscription: Subscription | null;
  readonly charges: readonly Charge[];
  readonly payments: readonly Payment[];
}

export interface Plan {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly version: number;
  readonly pricePerEmployee: string;
  readonly minBillableEmployees: number;
  readonly defaultEmployeeCap: number | null;
  readonly trialDays: number;
  readonly paymentTermsDays: number;
  readonly active: boolean;
}

export interface Overview {
  readonly tenantsByStatus: Record<string, number>;
  readonly activeEmployees: number;
  readonly outstanding: string | null;
  readonly dueCharges: ReadonlyArray<{ id: string; tenantId: string; tenantName: string; total: string; amountPaid: string; dueDate: string | null; status: string }>;
  readonly recentPayments: ReadonlyArray<{ id: string; tenantName: string; amount: string; method: string; receivedOn: string | null }>;
}

export type { FeatureView };

export const TENANT_STATUS: Readonly<Record<string, { label: string; tone: ToneOrNeutral; help: string }>> = {
  TRIAL: { label: 'Trial', tone: 'info', help: 'Free trial — full access until the trial ends.' },
  ACTIVE: { label: 'Active', tone: 'success', help: 'Paying client with full access.' },
  PAST_DUE: { label: 'Past due', tone: 'warning', help: 'A charge is overdue. Access continues for now.' },
  SUSPENDED: { label: 'Suspended', tone: 'error', help: 'Read-only. Employees cannot punch.' },
  CANCELLED: { label: 'Cancelled', tone: 'default', help: 'No longer a client.' },
};

export const BILLING_STATUS: Readonly<Record<string, { label: string; tone: ToneOrNeutral }>> = {
  TRIALING: { label: 'Trial', tone: 'info' },
  ACTIVE: { label: 'Active', tone: 'success' },
  PAST_DUE: { label: 'Past due', tone: 'warning' },
  SUSPENDED: { label: 'Suspended', tone: 'error' },
  CANCELLED: { label: 'Cancelled', tone: 'default' },
  DRAFT: { label: 'Draft', tone: 'default' },
  DUE: { label: 'Due', tone: 'warning' },
  OVERDUE: { label: 'Overdue', tone: 'error' },
  PAID: { label: 'Paid', tone: 'success' },
  PARTIALLY_PAID: { label: 'Part paid', tone: 'info' },
  VOID: { label: 'Void', tone: 'default' },
};

export const PAYMENT_METHOD_LABEL: Readonly<Record<string, string>> = {
  BANK_TRANSFER: 'Bank transfer',
  UPI: 'UPI',
  CHEQUE: 'Cheque',
  CASH: 'Cash',
  OTHER: 'Other',
};

export const INDIAN_STATES: ReadonlyArray<{ code: string; name: string }> = [
  { code: 'AN', name: 'Andaman & Nicobar' }, { code: 'AP', name: 'Andhra Pradesh' }, { code: 'AR', name: 'Arunachal Pradesh' },
  { code: 'AS', name: 'Assam' }, { code: 'BR', name: 'Bihar' }, { code: 'CH', name: 'Chandigarh' }, { code: 'CT', name: 'Chhattisgarh' },
  { code: 'DL', name: 'Delhi' }, { code: 'DN', name: 'Dadra & Nagar Haveli and Daman & Diu' }, { code: 'GA', name: 'Goa' },
  { code: 'GJ', name: 'Gujarat' }, { code: 'HP', name: 'Himachal Pradesh' }, { code: 'HR', name: 'Haryana' }, { code: 'JH', name: 'Jharkhand' },
  { code: 'JK', name: 'Jammu & Kashmir' }, { code: 'KA', name: 'Karnataka' }, { code: 'KL', name: 'Kerala' }, { code: 'LA', name: 'Ladakh' },
  { code: 'LD', name: 'Lakshadweep' }, { code: 'MH', name: 'Maharashtra' }, { code: 'ML', name: 'Meghalaya' }, { code: 'MN', name: 'Manipur' },
  { code: 'MP', name: 'Madhya Pradesh' }, { code: 'MZ', name: 'Mizoram' }, { code: 'NL', name: 'Nagaland' }, { code: 'OR', name: 'Odisha' },
  { code: 'PB', name: 'Punjab' }, { code: 'PY', name: 'Puducherry' }, { code: 'RJ', name: 'Rajasthan' }, { code: 'SK', name: 'Sikkim' },
  { code: 'TG', name: 'Telangana' }, { code: 'TN', name: 'Tamil Nadu' }, { code: 'TR', name: 'Tripura' }, { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'UT', name: 'Uttarakhand' }, { code: 'WB', name: 'West Bengal' },
];
