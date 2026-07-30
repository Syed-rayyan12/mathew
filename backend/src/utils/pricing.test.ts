import { describe, it, expect } from 'vitest';
import {
  quote,
  describeQuote,
  findGroupBand,
  PricingError,
  GROUP_BANDS,
  SINGLE_STANDARD_MONTHLY_PENCE,
  SINGLE_PLATINUM_MONTHLY_PENCE,
  type PlanTier,
} from './pricing';

describe('single rates', () => {
  it('charges £23.95 for one standard nursery', () => {
    const q = quote('standard', 'monthly', 1);
    expect(q.unitAmountPence).toBe(2395);
    expect(q.totalPence).toBe(2395);
    expect(q.discountPercent).toBe(0);
    expect(q.isGroup).toBe(false);
  });

  it('charges £38.60 for one platinum nursery', () => {
    const q = quote('platinum', 'monthly', 1);
    expect(q.unitAmountPence).toBe(3860);
    expect(q.totalPence).toBe(3860);
    expect(q.discountPercent).toBe(0);
    expect(q.isGroup).toBe(false);
  });

  it('exports the two single rates', () => {
    expect(SINGLE_STANDARD_MONTHLY_PENCE).toBe(2395);
    expect(SINGLE_PLATINUM_MONTHLY_PENCE).toBe(3860);
  });
});

describe('group bands', () => {
  const cases: Array<[number, number, number]> = [
    // [count, unitPence, discountPercent] — both edges of every band
    [2, 3474, 10],
    [5, 3474, 10],
    [6, 3088, 20],
    [15, 3088, 20],
    [16, 2702, 30],
    [30, 2702, 30],
    [31, 2316, 40],
    [60, 2316, 40],
  ];

  it.each(cases)('%i nurseries bills at %ip each (%i%% off)', (count, unit, discount) => {
    const q = quote('platinum', 'monthly', count);
    expect(q.unitAmountPence).toBe(unit);
    expect(q.totalPence).toBe(unit * count);
    expect(q.discountPercent).toBe(discount);
    expect(q.isGroup).toBe(true);
  });

  it('bands are contiguous and cover 2..60', () => {
    for (let n = 2; n <= 60; n++) {
      expect(findGroupBand(n), `no band for ${n}`).not.toBeNull();
    }
    expect(findGroupBand(1)).toBeNull();
    expect(findGroupBand(61)).toBeNull();
  });

  it('band rates are the advertised discounts off the single platinum rate', () => {
    for (const band of GROUP_BANDS) {
      const expected = Math.round(
        SINGLE_PLATINUM_MONTHLY_PENCE * (1 - band.discountPercent / 100)
      );
      expect(band.unitPence).toBe(expected);
    }
  });
});

describe('annual billing', () => {
  it('is twelve times monthly with no extra discount', () => {
    for (const count of [1, 2, 6, 16, 31, 60]) {
      const tier: PlanTier = count === 1 ? 'standard' : 'platinum';
      const m = quote(tier, 'monthly', count);
      const a = quote(tier, 'annual', count);
      expect(a.unitAmountPence).toBe(m.unitAmountPence * 12);
      expect(a.totalPence).toBe(m.totalPence * 12);
      expect(a.discountPercent).toBe(m.discountPercent);
    }
  });

  it('charges annual single platinum at £463.20', () => {
    expect(quote('platinum', 'annual', 1).totalPence).toBe(46320);
  });
});

describe('rejections', () => {
  it('refuses standard for more than one nursery', () => {
    expect(() => quote('standard', 'monthly', 2)).toThrow(PricingError);
    expect(() => quote('standard', 'monthly', 2)).toThrow(/Group.*Platinum/i);
  });

  it('refuses 61 or more as self-serve', () => {
    expect(() => quote('platinum', 'monthly', 61)).toThrow(PricingError);
    expect(() => quote('platinum', 'monthly', 500)).toThrow(PricingError);
  });

  it('refuses non-integer, zero and negative counts', () => {
    for (const bad of [0, -1, 1.5, NaN, Infinity]) {
      expect(() => quote('platinum', 'monthly', bad), `count ${bad}`).toThrow(PricingError);
    }
  });
});

describe('describeQuote', () => {
  it('names single platinum without a discount note', () => {
    const d = describeQuote(quote('platinum', 'monthly', 1));
    expect(d.label).toBe('Single Platinum Nursery Listing – Monthly');
    expect(d.description).toContain('1 nursery');
    expect(d.description).not.toContain('discount');
  });

  it('names a group with its size and discount', () => {
    const d = describeQuote(quote('platinum', 'monthly', 8));
    expect(d.label).toBe('Group Nursery Listing (8 nurseries) – Monthly');
    expect(d.description).toContain('20% group discount');
    expect(d.description).toContain('£247.04');
  });
});
