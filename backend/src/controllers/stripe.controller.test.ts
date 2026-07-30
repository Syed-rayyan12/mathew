import { describe, it, expect } from 'vitest';
import { isUsableProrationDate } from './stripe.controller';

// Representative timestamps. All arithmetic is in seconds.
const PERIOD_START = 1_700_000_000; // arbitrary fixed point
const PERIOD_END   = PERIOD_START + 30 * 24 * 60 * 60; // +30 days

describe('isUsableProrationDate (A2)', () => {
  it('accepts a timestamp that is recent and inside the period', () => {
    const now = PERIOD_START + 60 * 60; // 1 hour into the period
    expect(isUsableProrationDate(now, PERIOD_START, PERIOD_END, now)).toBe(true);
  });

  it('accepts a timestamp that is exactly at period start', () => {
    const now = PERIOD_START + 1;
    expect(isUsableProrationDate(PERIOD_START, PERIOD_START, PERIOD_END, now)).toBe(true);
  });

  it('rejects a timestamp that is more than 15 minutes old', () => {
    const ts  = PERIOD_START + 60 * 60;         // 1 hour into the period
    const now = ts + 15 * 60 + 1;               // 15 min 1 sec later
    expect(isUsableProrationDate(ts, PERIOD_START, PERIOD_END, now)).toBe(false);
  });

  it('rejects a timestamp that is in the future relative to now', () => {
    const now = PERIOD_START + 60 * 60;
    const ts  = now + 1;                         // 1 second in the future
    expect(isUsableProrationDate(ts, PERIOD_START, PERIOD_END, now)).toBe(false);
  });

  it('rejects a timestamp before the period start', () => {
    const now = PERIOD_START + 60;
    const ts  = PERIOD_START - 1;
    expect(isUsableProrationDate(ts, PERIOD_START, PERIOD_END, now)).toBe(false);
  });

  it('rejects a timestamp after the period end', () => {
    const ts  = PERIOD_END + 1;
    const now = ts + 1;                          // now is even later
    expect(isUsableProrationDate(ts, PERIOD_START, PERIOD_END, now)).toBe(false);
  });

  it('rejects a non-integer number', () => {
    const now = PERIOD_START + 60;
    expect(isUsableProrationDate(PERIOD_START + 0.5, PERIOD_START, PERIOD_END, now)).toBe(false);
  });

  it('rejects non-numeric values', () => {
    const now = PERIOD_START + 60;
    expect(isUsableProrationDate(undefined, PERIOD_START, PERIOD_END, now)).toBe(false);
    expect(isUsableProrationDate(null, PERIOD_START, PERIOD_END, now)).toBe(false);
    expect(isUsableProrationDate('1700000001', PERIOD_START, PERIOD_END, now)).toBe(false);
    expect(isUsableProrationDate(NaN, PERIOD_START, PERIOD_END, now)).toBe(false);
  });

  it('accepts a timestamp exactly 15 minutes old (boundary is exclusive)', () => {
    const ts  = PERIOD_START + 60 * 60;
    const now = ts + 15 * 60;               // exactly 15 min, not over
    expect(isUsableProrationDate(ts, PERIOD_START, PERIOD_END, now)).toBe(true);
  });
});
