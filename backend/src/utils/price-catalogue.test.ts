import { describe, it, expect } from 'vitest';
import {
  GROUP_BANDS,
  PRICE_VERSION,
  SINGLE_STANDARD_MONTHLY_PENCE,
  flatAmountPence,
  parseLookupKey,
  priceLookupKey,
  toStripeTiers,
  type StripeTier,
} from './pricing';

/**
 * Every ladder that has ever been published, keyed by the version it was
 * published under. Stripe Prices cannot be edited, so changing a band means
 * minting a new Price, which means bumping PRICE_VERSION and adding an entry
 * here. The old entries stay as history — subscribers are still on them.
 */
const PUBLISHED: Record<number, { standardMonthly: number; platinumMonthly: StripeTier[] }> = {
  1: {
    standardMonthly: 2395,
    platinumMonthly: [
      { up_to: 1, unit_amount: 3860 },
      { up_to: 5, unit_amount: 3474 },
      { up_to: 15, unit_amount: 3088 },
      { up_to: 30, unit_amount: 2702 },
      { up_to: 60, unit_amount: 2316 },
      { up_to: 'inf', unit_amount: 2316 },
    ],
  },
};

describe('toStripeTiers', () => {
  it('produces the volume ladder for the monthly platinum price', () => {
    expect(toStripeTiers(GROUP_BANDS, 'monthly')).toEqual([
      { up_to: 1, unit_amount: 3860 },
      { up_to: 5, unit_amount: 3474 },
      { up_to: 15, unit_amount: 3088 },
      { up_to: 30, unit_amount: 2702 },
      { up_to: 60, unit_amount: 2316 },
      { up_to: 'inf', unit_amount: 2316 },
    ]);
  });

  it('multiplies every tier by twelve for the annual price', () => {
    expect(toStripeTiers(GROUP_BANDS, 'annual')).toEqual([
      { up_to: 1, unit_amount: 46320 },
      { up_to: 5, unit_amount: 41688 },
      { up_to: 15, unit_amount: 37056 },
      { up_to: 30, unit_amount: 32424 },
      { up_to: 60, unit_amount: 27792 },
      { up_to: 'inf', unit_amount: 27792 },
    ]);
  });

  it('ends unbounded, because Stripe requires a fallback tier', () => {
    const tiers = toStripeTiers(GROUP_BANDS, 'monthly');
    expect(tiers[tiers.length - 1].up_to).toBe('inf');
  });

  it('repeats the top rate in the fallback tier so 61+ is never cheaper', () => {
    const tiers = toStripeTiers(GROUP_BANDS, 'monthly');
    expect(tiers[tiers.length - 1].unit_amount).toBe(tiers[tiers.length - 2].unit_amount);
  });
});

describe('PRICE_VERSION', () => {
  it('has a published ladder recorded for the current version', () => {
    expect(
      PUBLISHED[PRICE_VERSION],
      `No published ladder for v${PRICE_VERSION}. Add one to PUBLISHED.`
    ).toBeDefined();
  });

  it('matches the ladder published under that version', () => {
    const published = PUBLISHED[PRICE_VERSION];
    expect(
      toStripeTiers(GROUP_BANDS, 'monthly'),
      'A band changed without bumping PRICE_VERSION. Existing subscribers are ' +
        'on the old Price, so bump the version and add a new PUBLISHED entry.'
    ).toEqual(published.platinumMonthly);
    expect(SINGLE_STANDARD_MONTHLY_PENCE).toBe(published.standardMonthly);
  });
});

describe('flatAmountPence', () => {
  it('prices standard monthly and annual', () => {
    expect(flatAmountPence('standard', 'monthly')).toBe(2395);
    expect(flatAmountPence('standard', 'annual')).toBe(28740);
  });

  it('prices a single platinum at the top of the ladder', () => {
    expect(flatAmountPence('platinum', 'monthly')).toBe(3860);
    expect(flatAmountPence('platinum', 'annual')).toBe(46320);
  });
});

describe('priceLookupKey / parseLookupKey', () => {
  it('builds the four documented keys', () => {
    expect(priceLookupKey('standard', 'monthly')).toBe('mathew_standard_monthly_v1');
    expect(priceLookupKey('standard', 'annual')).toBe('mathew_standard_annual_v1');
    expect(priceLookupKey('platinum', 'monthly')).toBe('mathew_platinum_monthly_v1');
    expect(priceLookupKey('platinum', 'annual')).toBe('mathew_platinum_annual_v1');
  });

  it('round-trips', () => {
    expect(parseLookupKey(priceLookupKey('platinum', 'annual'))).toEqual({
      tier: 'platinum',
      billing: 'annual',
    });
  });

  it('reads a grandfathered key from an older version', () => {
    expect(parseLookupKey('mathew_platinum_monthly_v7')).toEqual({
      tier: 'platinum',
      billing: 'monthly',
    });
  });

  it('returns null rather than guessing at anything unrecognised', () => {
    expect(parseLookupKey(null)).toBeNull();
    expect(parseLookupKey(undefined)).toBeNull();
    expect(parseLookupKey('')).toBeNull();
    expect(parseLookupKey('price_1234')).toBeNull();
    expect(parseLookupKey('mathew_gold_monthly_v1')).toBeNull();
    expect(parseLookupKey('mathew_platinum_weekly_v1')).toBeNull();
  });
});
