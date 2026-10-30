/** Units a duration can be typed in. The API always takes whole minutes. */
export type DurationUnit = 'min' | 'h' | 'd';

export const UNIT_MINUTES: Readonly<Record<DurationUnit, number>> = { min: 1, h: 60, d: 1440 };

export const UNIT_LABEL: Readonly<Record<DurationUnit, string>> = { min: 'min', h: 'hrs', d: 'days' };

/** Whole minutes for an amount typed in `unit`; null when blank or not a number. */
export function toMinutes(text: string, unit: DurationUnit): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const minutes = Number(trimmed) * UNIT_MINUTES[unit];
  return Number.isFinite(minutes) ? Math.round(minutes) : null;
}

/** `minutes` shown in `unit`, at most two decimals; empty for null. */
export function fromMinutes(minutes: number | null, unit: DurationUnit): string {
  if (minutes === null) return '';
  return String(Math.round((minutes / UNIT_MINUTES[unit]) * 100) / 100);
}

/** The largest offered unit that shows `minutes` as a clean amount of at least 1 (90 → 1.5 h, 100 → 100 min). */
export function bestUnit(minutes: number | null, units: readonly DurationUnit[]): DurationUnit {
  const largestFirst = [...units].sort((a, b) => UNIT_MINUTES[b] - UNIT_MINUTES[a]);
  if (!minutes) return largestFirst[0];
  return largestFirst.find((u) => minutes >= UNIT_MINUTES[u] && (minutes * 100) % UNIT_MINUTES[u] === 0) ?? largestFirst[largestFirst.length - 1];
}
