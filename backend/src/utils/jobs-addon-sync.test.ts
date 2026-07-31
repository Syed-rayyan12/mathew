import { describe, it, expect } from 'vitest';
import { readJobsAddonSubscription } from './jobs-addon-sync';
import { SubscriptionShapeError } from './subscription-sync';

const fakeItem = (lookupKey: string, quantity = 1) => ({
  price: { id: 'price_xxx', lookup_key: lookupKey },
  quantity,
  current_period_end: 1750000000,
});

const fakeSub = (items: any[], status = 'active') =>
  ({
    id: 'sub_addon_123',
    status,
    cancel_at: null,
    customer: 'cus_123',
    items: { data: items },
  }) as any;

describe('readJobsAddonSubscription', () => {
  it('reads a valid add-on subscription', () => {
    const sub = fakeSub([fakeItem('mathew_jobs_addon_monthly_v1')]);
    const snap = readJobsAddonSubscription(sub);
    expect(snap.jobsAddonSubscriptionId).toBe('sub_addon_123');
    expect(snap.jobsAddonStatus).toBe('active');
    expect(snap.jobsAddonCurrentPeriodEnd).toBeInstanceOf(Date);
    expect(snap.jobsAddonCancelAt).toBeNull();
  });

  it('throws SubscriptionShapeError on a plan lookup key', () => {
    const sub = fakeSub([fakeItem('mathew_standard_monthly_v1')]);
    expect(() => readJobsAddonSubscription(sub)).toThrow(SubscriptionShapeError);
  });

  it('throws SubscriptionShapeError on an unrecognised key', () => {
    const sub = fakeSub([fakeItem('some_random_key')]);
    expect(() => readJobsAddonSubscription(sub)).toThrow(SubscriptionShapeError);
  });

  it('throws SubscriptionShapeError when there are zero items', () => {
    const sub = fakeSub([]);
    expect(() => readJobsAddonSubscription(sub)).toThrow(SubscriptionShapeError);
  });

  it('throws SubscriptionShapeError when there are two items', () => {
    const sub = fakeSub([
      fakeItem('mathew_jobs_addon_monthly_v1'),
      fakeItem('mathew_jobs_addon_monthly_v1'),
    ]);
    expect(() => readJobsAddonSubscription(sub)).toThrow(SubscriptionShapeError);
  });

  it('maps cancel_at to a Date when present', () => {
    const sub = fakeSub([fakeItem('mathew_jobs_addon_monthly_v1')]);
    sub.cancel_at = 1760000000;
    const snap = readJobsAddonSubscription(sub);
    expect(snap.jobsAddonCancelAt).toBeInstanceOf(Date);
    expect(snap.jobsAddonCancelAt!.getTime()).toBe(1760000000 * 1000);
  });
});
