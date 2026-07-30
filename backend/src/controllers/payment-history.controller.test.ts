import { describe, it, expect } from 'vitest';
import Stripe from 'stripe';
import { planLine, lookupKeyOf } from './payment-history.controller';

// Minimal InvoiceLineItem factories. Only the fields planLine and lookupKeyOf
// read need to be present — quantity and other fields are irrelevant here.
function makeLine(lookupKey: string | null, amount: number): Stripe.InvoiceLineItem {
  return {
    id: `li_${Math.random()}`,
    object: 'line_item',
    amount,
    currency: 'gbp',
    description: null,
    quantity: 1,
    price: lookupKey ? ({ lookup_key: lookupKey } as any) : null,
    // All other required fields can be omitted for these pure-function tests.
  } as unknown as Stripe.InvoiceLineItem;
}

const STANDARD_KEY = 'mathew_standard_monthly_v1';
const PLATINUM_KEY = 'mathew_platinum_monthly_v1';

describe('planLine (C1)', () => {
  it('returns the single line on a one-line invoice', () => {
    const line = makeLine(STANDARD_KEY, 2395);
    expect(planLine([line])).toBe(line);
  });

  it('picks the charge (positive) over the credit (negative) on a proration invoice', () => {
    // data[0] is the credit for the old price — the defect was returning this.
    const credit = makeLine(STANDARD_KEY, -1500);
    const charge = makeLine(PLATINUM_KEY, 3860);
    const result = planLine([credit, charge]);
    expect(result).toBe(charge);
    // Explicit: it must carry the NEW lookup key, not the old one.
    expect(lookupKeyOf(result)).toBe(PLATINUM_KEY);
  });

  it('ignores lines whose lookup keys are unrecognised', () => {
    const unknown = makeLine('price_something_else', 9999);
    const valid = makeLine(STANDARD_KEY, 2395);
    expect(planLine([unknown, valid])).toBe(valid);
  });

  it('returns null when no line has a parseable key', () => {
    const unknown1 = makeLine('price_abc', 100);
    const unknown2 = makeLine(null, 200);
    expect(planLine([unknown1, unknown2])).toBeNull();
  });

  it('returns null for an empty array', () => {
    expect(planLine([])).toBeNull();
  });

  it('on an all-negative array picks the least-negative (closest to a subject)', () => {
    const mostNegative = makeLine(STANDARD_KEY, -3000);
    const leastNegative = makeLine(PLATINUM_KEY, -500);
    expect(planLine([mostNegative, leastNegative])).toBe(leastNegative);
  });
});
