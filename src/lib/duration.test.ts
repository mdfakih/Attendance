import { describe, expect, it } from 'vitest';
import { bestUnit, fromMinutes, toMinutes } from './duration';

describe('toMinutes', () => {
  it.each([
    ['45', 'min', 45],
    ['8', 'h', 480],
    ['1.5', 'h', 90],
    ['1.1', 'h', 66],
    ['0.01', 'h', 1],
    ['1', 'd', 1440],
    ['0', 'h', 0],
    [' 2 ', 'h', 120],
  ] as const)('%s %s → %d', (text, unit, expected) => {
    expect(toMinutes(text, unit)).toBe(expected);
  });

  it.each(['', '  ', 'abc', '1e308'])('"%s" → null', (text) => {
    expect(toMinutes(text, 'h')).toBeNull();
  });
});

describe('fromMinutes', () => {
  it.each([
    [480, 'h', '8'],
    [90, 'h', '1.5'],
    [100, 'h', '1.67'],
    [45, 'min', '45'],
    [2880, 'd', '2'],
    [null, 'h', ''],
  ] as const)('%s in %s → "%s"', (minutes, unit, expected) => {
    expect(fromMinutes(minutes, unit)).toBe(expected);
  });

  it('round-trips through the shown amount', () => {
    expect(toMinutes(fromMinutes(100, 'h'), 'h')).toBe(100);
  });
});

describe('bestUnit', () => {
  it.each([
    [480, ['min', 'h'], 'h'],
    [90, ['min', 'h'], 'h'],
    [45, ['min', 'h'], 'min'],
    [100, ['min', 'h'], 'min'],
    [1440, ['min', 'h'], 'h'],
    [1440, ['min', 'h', 'd'], 'd'],
    [null, ['min', 'h'], 'h'],
    [0, ['min', 'h'], 'h'],
    [480, ['min'], 'min'],
    [100, ['h', 'd'], 'h'],
  ] as const)('%s with %j → %s', (minutes, units, expected) => {
    expect(bestUnit(minutes, units)).toBe(expected);
  });
});
