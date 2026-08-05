import { describe, it, expect } from 'vitest';
import {
  PLAN_MINIMUM_TERM_MONTHS,
  NOTICE_DAYS,
  OFFER_TRIAL_MONTHS,
  OFFER_TRIAL_DAYS,
  cancellationEndDate,
  planMinimumTermEnd,
} from './pricing';

const d = (iso: string) => new Date(iso);

describe('constants', () => {
  it('are the advertised terms', () => {
    expect(PLAN_MINIMUM_TERM_MONTHS).toBe(12);
    expect(NOTICE_DAYS).toBe(90);
    expect(OFFER_TRIAL_MONTHS).toBe(6);
    expect(OFFER_TRIAL_DAYS).toBe(183);
  });
});

describe('planMinimumTermEnd', () => {
  it('is twelve calendar months after the start', () => {
    expect(planMinimumTermEnd(d('2026-01-15T10:00:00Z')).toISOString())
      .toBe(d('2027-01-15T10:00:00Z').toISOString());
  });

  it('does not overflow a short target month', () => {
    // 29 Feb 2028 + 12 months is 28 Feb 2029, not 1 March.
    expect(planMinimumTermEnd(d('2028-02-29T10:00:00Z')).toISOString())
      .toBe(d('2029-02-28T10:00:00Z').toISOString());
  });
});

describe('cancellationEndDate', () => {
  const termEnd = d('2027-01-01T00:00:00Z');

  it('lets the term bind when notice is served early', () => {
    // Notice in month 2: notice+90d is well inside the term.
    expect(cancellationEndDate(termEnd, d('2026-03-01T00:00:00Z')).toISOString())
      .toBe(termEnd.toISOString());
  });

  it('lets the term bind when notice is served at month nine', () => {
    // notice + 90d lands 30 Dec 2026, one day short of the term end.
    expect(cancellationEndDate(termEnd, d('2026-10-01T00:00:00Z')).toISOString())
      .toBe(termEnd.toISOString());
  });

  it('lets the notice bind when it is served late in the term', () => {
    const served = d('2026-12-01T00:00:00Z');
    const expected = new Date(served.getTime() + NOTICE_DAYS * 864e5);
    expect(cancellationEndDate(termEnd, served).toISOString())
      .toBe(expected.toISOString());
    expect(expected.getTime()).toBeGreaterThan(termEnd.getTime());
  });

  it('falls back to notice alone for a grandfathered account', () => {
    const served = d('2026-03-01T00:00:00Z');
    expect(cancellationEndDate(null, served).toISOString())
      .toBe(new Date(served.getTime() + NOTICE_DAYS * 864e5).toISOString());
  });

  it('is exactly the term end when the two clocks tie', () => {
    const served = new Date(termEnd.getTime() - NOTICE_DAYS * 864e5);
    expect(cancellationEndDate(termEnd, served).toISOString())
      .toBe(termEnd.toISOString());
  });
});
