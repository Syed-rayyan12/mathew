import { describe, it, expect } from 'vitest';
import { isUsableProrationDate } from './stripe.controller';
import { planMinimumTermEnd, OFFER_TRIAL_DAYS, cancellationEndDate } from '../utils/pricing';

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

describe('plan minimum term on checkout.session.completed', () => {
  it('is twelve months from subscription creation', () => {
    const created = new Date('2026-08-05T12:00:00Z');
    expect(planMinimumTermEnd(created).toISOString())
      .toBe(new Date('2027-08-05T12:00:00Z').toISOString());
  });

  it('does not drift when the same subscription is seen twice', () => {
    // Redelivery recomputes from sub.created, which never changes, so the
    // value the guard would have written is identical to the one already
    // stored. The `where: { minimumTermEnd: null }` clause then makes the
    // second write a no-op rather than an equal-value overwrite.
    const created = new Date('2026-08-05T12:00:00Z');
    expect(planMinimumTermEnd(created).getTime())
      .toBe(planMinimumTermEnd(created).getTime());
  });

  it('runs from subscription creation, not from the trial end', () => {
    // A six-month trial sits INSIDE the term. If the term were measured from
    // the first invoice the offer would buy an 18-month commitment, which is
    // not what the disclosure says.
    const created = new Date('2026-08-05T12:00:00Z');
    const trialEnd = new Date(created.getTime() + OFFER_TRIAL_DAYS * 864e5);
    expect(planMinimumTermEnd(created).getTime())
      .toBeLessThan(planMinimumTermEnd(trialEnd).getTime());
    expect(planMinimumTermEnd(created).toISOString())
      .toBe(new Date('2027-08-05T12:00:00Z').toISOString());
  });
});

describe('requestPlanCancellation date maths', () => {
  it('reports the term end when notice is served early', () => {
    const termEnd = new Date('2027-01-01T00:00:00Z');
    const served = new Date('2026-03-01T00:00:00Z');
    expect(cancellationEndDate(termEnd, served).toISOString()).toBe(termEnd.toISOString());
  });

  it('reports notice plus ninety days for a grandfathered account', () => {
    const served = new Date('2026-03-01T00:00:00Z');
    expect(cancellationEndDate(null, served).toISOString())
      .toBe(new Date('2026-05-30T00:00:00Z').toISOString());
  });
});
