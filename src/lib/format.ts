import dayjs from 'dayjs';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

export function formatInr(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return inr.format(Number(value));
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (!minutes) return '0h';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatTime(iso: string | null | undefined): string {
  return iso ? dayjs(iso).format('HH:mm') : '—';
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dayjs(iso).format('DD MMM YYYY, HH:mm') : '—';
}

export function formatDate(date: string | null | undefined): string {
  return date ? dayjs(date).format('DD MMM YYYY') : '—';
}

export function todayIso(): string {
  return dayjs().format('YYYY-MM-DD');
}

export function thisMonth(): string {
  return dayjs().format('YYYY-MM');
}

export function monthLabel(month: string): string {
  return dayjs(`${month}-01`).format('MMMM YYYY');
}

export function shiftMonth(month: string, delta: number): string {
  return dayjs(`${month}-01`).add(delta, 'month').format('YYYY-MM');
}

export const STATUS_LABEL: Readonly<Record<string, string>> = {
  PRESENT: 'Present',
  HALF_DAY: 'Half day',
  ABSENT: 'Absent',
  LEAVE: 'Leave',
  HALF_LEAVE: 'Half-day leave',
  HOLIDAY: 'Holiday',
  WEEKLY_OFF: 'Weekly off',
  IN_PROGRESS: 'In progress',
  NOT_STARTED: 'Not punched',
  MISSING_OUT: 'Missing out',
};

export const STATUS_COLOR: Readonly<Record<string, 'success' | 'warning' | 'error' | 'info' | 'default' | 'secondary'>> = {
  PRESENT: 'success',
  IN_PROGRESS: 'info',
  HALF_DAY: 'warning',
  HALF_LEAVE: 'warning',
  ABSENT: 'error',
  LEAVE: 'secondary',
  HOLIDAY: 'default',
  WEEKLY_OFF: 'default',
  NOT_STARTED: 'default',
  MISSING_OUT: 'error',
};
