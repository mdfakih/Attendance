import type { ToneOrNeutral } from '@/lib/tone';

/** Leave and extra-time requests. */
export const REQUEST_STATUS: Readonly<Record<string, { label: string; tone: ToneOrNeutral }>> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'error' },
  CANCELLED: { label: 'Cancelled', tone: 'default' },
};

export const REQUEST_FILTERS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: '', label: 'All' },
];

export const EMPLOYEE_STATUS: Readonly<Record<string, { label: string; tone: ToneOrNeutral }>> = {
  ACTIVE: { label: 'Active', tone: 'success' },
  INVITED: { label: 'Invited', tone: 'info' },
  DEACTIVATED: { label: 'Deactivated', tone: 'warning' },
  EXITED: { label: 'Exited', tone: 'default' },
};

export const DEVICE_STATUS: Readonly<Record<string, { label: string; tone: ToneOrNeutral }>> = {
  NONE: { label: 'No phone', tone: 'default' },
  PENDING: { label: 'Awaiting approval', tone: 'warning' },
  ACTIVE: { label: 'Registered', tone: 'success' },
  REVOKED: { label: 'Released', tone: 'default' },
  REJECTED: { label: 'Rejected', tone: 'error' },
};

export const EXPORT_STATUS: Readonly<Record<string, { label: string; tone: ToneOrNeutral }>> = {
  QUEUED: { label: 'Queued', tone: 'default' },
  RUNNING: { label: 'Preparing', tone: 'info' },
  DONE: { label: 'Ready', tone: 'success' },
  FAILED: { label: 'Failed', tone: 'error' },
  EXPIRED: { label: 'Expired', tone: 'default' },
};

/** "MISSING_OUT" → "Missing out". */
export function flagLabel(flag: string): string {
  const text = flag.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
