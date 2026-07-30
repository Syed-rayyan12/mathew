import { describe, it, expect } from 'vitest';
import { SubscriptionShapeError, readSubscription, resolveDuplicate } from './subscription-sync';

/**
 * The shape readSubscription actually reads, not a full Stripe object. Cast at
 * the call site keeps the fixtures readable; anything this helper omits is
 * something the function must not depend on.
 */
const subscription = (over: {
  lookupKey?: string | null;
  quantity?: number;
  status?: string;
  periodEnd?: number;
  cancelAt?: number | null;
  customer?: string;
  id?: string;
  items?: unknown[];
}) =>
  ({
    id: over.id ?? 'sub_123',
    status: over.status ?? 'active',
    customer: over.customer ?? 'cus_123',
    cancel_at: over.cancelAt ?? null,
    items: {
      data: over.items ?? [
        {
          quantity: over.quantity ?? 1,
          current_period_end: over.periodEnd ?? 1_800_000_000,
          price: { lookup_key: over.lookupKey === undefined ? 'mathew_platinum_monthly_v1' : over.lookupKey },
        },
      ],
    },
  }) as any;

describe('readSubscription', () => {
  it('takes the tier from the price lookup key', () => {
    expect(readSubscription(subscription({ lookupKey: 'mathew_standard_annual_v1' })).planTier)
      .toBe('standard');
    expect(readSubscription(subscription({ lookupKey: 'mathew_platinum_monthly_v1' })).planTier)
      .toBe('platinum');
  });

  it('reads a grandfathered price from an older version', () => {
    expect(readSubscription(subscription({ lookupKey: 'mathew_platinum_annual_v3' })).planTier)
      .toBe('platinum');
  });

  it('takes the nursery count from the item quantity', () => {
    expect(readSubscription(subscription({ quantity: 8 })).paidNurseryCount).toBe(8);
  });

  it('treats a missing quantity as one, which is what Stripe means by it', () => {
    expect(readSubscription(subscription({ quantity: undefined })).paidNurseryCount).toBe(1);
  });

  it('copies the status through verbatim', () => {
    expect(readSubscription(subscription({ status: 'past_due' })).subscriptionStatus)
      .toBe('past_due');
    expect(readSubscription(subscription({ status: 'canceled' })).subscriptionStatus)
      .toBe('canceled');
  });

  it('reads the period end off the item, where this API version keeps it', () => {
    expect(readSubscription(subscription({ periodEnd: 1_800_000_000 })).currentPeriodEnd)
      .toEqual(new Date(1_800_000_000_000));
  });

  it('reads a scheduled cancellation, and null when there is none', () => {
    expect(readSubscription(subscription({ cancelAt: 1_900_000_000 })).cancelAt)
      .toEqual(new Date(1_900_000_000_000));
    expect(readSubscription(subscription({ cancelAt: null })).cancelAt).toBeNull();
  });

  it('keeps the customer and subscription ids', () => {
    const snap = readSubscription(subscription({ id: 'sub_abc', customer: 'cus_xyz' }));
    expect(snap.stripeSubscriptionId).toBe('sub_abc');
    expect(snap.stripeCustomerId).toBe('cus_xyz');
  });

  it('reads an expanded customer object as well as an id', () => {
    const snap = readSubscription(subscription({ customer: { id: 'cus_exp' } as any }));
    expect(snap.stripeCustomerId).toBe('cus_exp');
  });

  it('refuses a price it does not recognise rather than guessing a tier', () => {
    expect(() => readSubscription(subscription({ lookupKey: null })))
      .toThrow(SubscriptionShapeError);
    expect(() => readSubscription(subscription({ lookupKey: 'price_handmade' })))
      .toThrow(SubscriptionShapeError);
  });

  it('refuses a subscription with no items', () => {
    expect(() => readSubscription(subscription({ items: [] })))
      .toThrow(SubscriptionShapeError);
  });

  it('refuses a subscription with more than one item, which we never sell', () => {
    const two = subscription({});
    two.items.data.push({ ...two.items.data[0] });
    expect(() => readSubscription(two)).toThrow(SubscriptionShapeError);
  });

  // A5: quantity validation — quote() is the gate; a manual Stripe dashboard
  // change could set a combination that was never sold here.
  it('A5: refuses a Standard subscription with quantity 2 (Standard has no group)', () => {
    expect(() =>
      readSubscription(subscription({ lookupKey: 'mathew_standard_monthly_v1', quantity: 2 }))
    ).toThrow(SubscriptionShapeError);
  });

  it('A5: refuses a Platinum subscription with quantity 61 (bespoke threshold)', () => {
    expect(() =>
      readSubscription(subscription({ lookupKey: 'mathew_platinum_monthly_v1', quantity: 61 }))
    ).toThrow(SubscriptionShapeError);
  });

  it('A5: accepts a Platinum subscription with quantity 8 (valid group)', () => {
    expect(() =>
      readSubscription(subscription({ lookupKey: 'mathew_platinum_monthly_v1', quantity: 8 }))
    ).not.toThrow();
    expect(readSubscription(subscription({ lookupKey: 'mathew_platinum_monthly_v1', quantity: 8 })).paidNurseryCount)
      .toBe(8);
  });
});

// Review fix 3: resolveDuplicate is the highest-risk logic; tested here as a
// pure function, isolated from Stripe and database I/O.
describe('resolveDuplicate', () => {
  const RECORDED = 'sub_recorded';
  const INCOMING = 'sub_incoming';
  const T1 = 1_700_000_000; // older
  const T2 = 1_700_010_000; // newer

  it('no recorded id → keep incoming, cancel nothing', () => {
    expect(resolveDuplicate({
      recordedId: null,
      recordedStatus: null,
      recordedCreated: 0,
      incomingId: INCOMING,
      incomingCreated: T1,
    })).toEqual({ keepId: INCOMING, cancelId: null });
  });

  it('recorded id equals incoming id → keep it, cancel nothing', () => {
    expect(resolveDuplicate({
      recordedId: INCOMING,
      recordedStatus: 'active',
      recordedCreated: T1,
      incomingId: INCOMING,
      incomingCreated: T1,
    })).toEqual({ keepId: INCOMING, cancelId: null });
  });

  it('recorded present but not live (reactivation) → keep incoming, cancel nothing', () => {
    expect(resolveDuplicate({
      recordedId: RECORDED,
      recordedStatus: 'canceled',
      recordedCreated: T1,
      incomingId: INCOMING,
      incomingCreated: T2,
    })).toEqual({ keepId: INCOMING, cancelId: null });
  });

  it('recorded missing from Stripe (resource_missing → status null) → keep incoming, cancel nothing', () => {
    // resource_missing is represented by passing null status (review fix 1 feeds this path)
    expect(resolveDuplicate({
      recordedId: RECORDED,
      recordedStatus: null,
      recordedCreated: 0,
      incomingId: INCOMING,
      incomingCreated: T2,
    })).toEqual({ keepId: INCOMING, cancelId: null });
  });

  it('recorded live and older → keep recorded, cancel incoming', () => {
    expect(resolveDuplicate({
      recordedId: RECORDED,
      recordedStatus: 'active',
      recordedCreated: T1,
      incomingId: INCOMING,
      incomingCreated: T2,
    })).toEqual({ keepId: RECORDED, cancelId: INCOMING });
  });

  it('recorded live and newer → keep incoming, cancel recorded', () => {
    expect(resolveDuplicate({
      recordedId: RECORDED,
      recordedStatus: 'active',
      recordedCreated: T2,
      incomingId: INCOMING,
      incomingCreated: T1,
    })).toEqual({ keepId: INCOMING, cancelId: RECORDED });
  });

  it('equal created timestamps → deterministic (keeps recorded, stable sort)', () => {
    const result = resolveDuplicate({
      recordedId: RECORDED,
      recordedStatus: 'active',
      recordedCreated: T1,
      incomingId: INCOMING,
      incomingCreated: T1,
    });
    // Must be deterministic — both calls must return the same answer.
    expect(result).toEqual(resolveDuplicate({
      recordedId: RECORDED,
      recordedStatus: 'active',
      recordedCreated: T1,
      incomingId: INCOMING,
      incomingCreated: T1,
    }));
    // Recorded wins the tie (stable sort — recorded <= incoming).
    expect(result).toEqual({ keepId: RECORDED, cancelId: INCOMING });
  });

  it('past_due is treated as live (live on purpose per domain rules)', () => {
    expect(resolveDuplicate({
      recordedId: RECORDED,
      recordedStatus: 'past_due',
      recordedCreated: T1,
      incomingId: INCOMING,
      incomingCreated: T2,
    })).toEqual({ keepId: RECORDED, cancelId: INCOMING });
  });

  it('trialing is treated as live', () => {
    expect(resolveDuplicate({
      recordedId: RECORDED,
      recordedStatus: 'trialing',
      recordedCreated: T1,
      incomingId: INCOMING,
      incomingCreated: T2,
    })).toEqual({ keepId: RECORDED, cancelId: INCOMING });
  });
});
