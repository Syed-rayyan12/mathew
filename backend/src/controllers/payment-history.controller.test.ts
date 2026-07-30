import { describe, it, expect } from 'vitest';
import Stripe from 'stripe';
import { planLine, lookupKeyOf, foldPricePage } from './payment-history.controller';

const STANDARD_KEY = 'mathew_standard_monthly_v1';
const PLATINUM_KEY = 'mathew_platinum_monthly_v1';

const STANDARD_PRICE_ID = 'price_standard_monthly';
const PLATINUM_PRICE_ID = 'price_platinum_monthly';

/**
 * A map mirroring what buildPriceKeyMap returns in production — price id to
 * lookup_key, built from the catalogue. Tests pass this in directly to avoid
 * any Stripe I/O.
 */
function makeMap(entries: Record<string, string> = {}): Map<string, string> {
  const defaults: Record<string, string> = {
    [STANDARD_PRICE_ID]: STANDARD_KEY,
    [PLATINUM_PRICE_ID]: PLATINUM_KEY,
  };
  return new Map(Object.entries({ ...defaults, ...entries }));
}

/**
 * Builds a minimal InvoiceLineItem using the real basil-era shape:
 * pricing.price_details.price holds the price id, not a top-level price field.
 * The quantity is a required parameter because the proration test must exercise
 * different quantities on credit vs charge lines.
 */
function makeLine(
  priceId: string | null,
  amount: number,
  quantity: number
): Stripe.InvoiceLineItem {
  const pricing: Stripe.InvoiceLineItem.Pricing | null = priceId
    ? {
        price_details: { price: priceId, product: 'prod_any' },
        type: 'price_details',
        unit_amount_decimal: null,
      }
    : null;

  return {
    id: `li_${Math.random()}`,
    object: 'line_item' as const,
    amount,
    currency: 'gbp',
    description: null,
    discount_amounts: null,
    discountable: false,
    discounts: [],
    invoice: null,
    livemode: false,
    metadata: {},
    parent: null,
    period: { end: 0, start: 0 },
    pretax_credit_amounts: null,
    pricing,
    quantity,
    subscription: null,
    subtotal: amount,
    taxes: null,
  };
}

/**
 * Builds a line where pricing.price_details.price is an expanded Stripe.Price
 * object rather than a bare id string, to exercise the expanded-object branch
 * of lookupKeyOf.
 */
function makeExpandedLine(
  lookupKey: string | null,
  amount: number,
  quantity: number
): Stripe.InvoiceLineItem {
  const priceObj: Stripe.Price = {
    id: 'price_expanded',
    object: 'price',
    lookup_key: lookupKey,
    active: true,
    billing_scheme: 'per_unit',
    created: 0,
    currency: 'gbp',
    custom_unit_amount: null,
    livemode: false,
    metadata: {},
    nickname: null,
    product: 'prod_any',
    recurring: null,
    tax_behavior: null,
    tiers_mode: null,
    transform_quantity: null,
    type: 'one_time',
    unit_amount: null,
    unit_amount_decimal: null,
  };

  const pricing: Stripe.InvoiceLineItem.Pricing = {
    price_details: { price: priceObj, product: 'prod_any' },
    type: 'price_details',
    unit_amount_decimal: null,
  };

  return {
    id: `li_${Math.random()}`,
    object: 'line_item' as const,
    amount,
    currency: 'gbp',
    description: null,
    discount_amounts: null,
    discountable: false,
    discounts: [],
    invoice: null,
    livemode: false,
    metadata: {},
    parent: null,
    period: { end: 0, start: 0 },
    pretax_credit_amounts: null,
    pricing,
    quantity,
    subscription: null,
    subtotal: amount,
    taxes: null,
  };
}

describe('lookupKeyOf', () => {
  it('returns the lookup key for a string price id found in the map', () => {
    const line = makeLine(STANDARD_PRICE_ID, 2395, 1);
    expect(lookupKeyOf(line, makeMap())).toBe(STANDARD_KEY);
  });

  it('returns null when the price id is absent from the map', () => {
    const line = makeLine('price_unknown_xyz', 2395, 1);
    expect(lookupKeyOf(line, makeMap())).toBeNull();
  });

  it('returns null when pricing is null', () => {
    const line = makeLine(null, 2395, 1);
    expect(lookupKeyOf(line, makeMap())).toBeNull();
  });

  it('reads lookup_key directly from an expanded Stripe.Price object', () => {
    const line = makeExpandedLine(PLATINUM_KEY, 3860, 1);
    expect(lookupKeyOf(line, makeMap())).toBe(PLATINUM_KEY);
  });

  it('returns null when an expanded Stripe.Price object has no lookup_key', () => {
    const line = makeExpandedLine(null, 3860, 1);
    expect(lookupKeyOf(line, makeMap())).toBeNull();
  });
});

describe('planLine (C1)', () => {
  it('returns the single line on a one-line invoice', () => {
    const line = makeLine(STANDARD_PRICE_ID, 2395, 1);
    expect(planLine([line], makeMap())).toBe(line);
  });

  it('picks the charge (positive) over the credit (negative) on a proration invoice, with the winner carrying the correct quantity', () => {
    // data[0] is the credit for the old price — the defect was returning this.
    // Credit has quantity 3 (old nursery count), charge has quantity 5 (new).
    const credit = makeLine(STANDARD_PRICE_ID, -1500, 3);
    const charge = makeLine(PLATINUM_PRICE_ID, 3860, 5);
    const result = planLine([credit, charge], makeMap());
    expect(result).toBe(charge);
    // Explicit: it must carry the NEW lookup key and the NEW nursery count.
    expect(lookupKeyOf(result, makeMap())).toBe(PLATINUM_KEY);
    expect(result?.quantity).toBe(5);
  });

  it('ignores lines whose price id is absent from the map', () => {
    const unknown = makeLine('price_something_else', 9999, 1);
    const valid = makeLine(STANDARD_PRICE_ID, 2395, 1);
    expect(planLine([unknown, valid], makeMap())).toBe(valid);
  });

  it('returns null when no line has a price id in the map', () => {
    const unknown1 = makeLine('price_abc', 100, 1);
    const unknown2 = makeLine(null, 200, 1);
    expect(planLine([unknown1, unknown2], makeMap())).toBeNull();
  });

  it('returns null for an empty array', () => {
    expect(planLine([], makeMap())).toBeNull();
  });

  it('on an all-negative array picks the least-negative (closest to a subject)', () => {
    const mostNegative = makeLine(STANDARD_PRICE_ID, -3000, 1);
    const leastNegative = makeLine(PLATINUM_PRICE_ID, -500, 1);
    expect(planLine([mostNegative, leastNegative], makeMap())).toBe(leastNegative);
  });

  it('resolves an expanded Stripe.Price object on a line (not just a bare id)', () => {
    const line = makeExpandedLine(STANDARD_KEY, 2395, 1);
    expect(planLine([line], makeMap())).toBe(line);
  });

  it('drops a line whose price id is in the map but whose lookup key does not parse', () => {
    // buildPriceKeyMap ingests the full catalogue with no lookup_keys filter, so
    // keys that are not mathew_* can land in the map. parseLookupKey is the only
    // guard that stops one becoming a plan name.
    const OTHER_PRICE_ID = 'price_other_product';
    const OTHER_KEY = 'some_other_product_key';
    const map = makeMap({ [OTHER_PRICE_ID]: OTHER_KEY });

    // The unrecognised-key line has the greatest amount — it would win if
    // parseLookupKey were not called.
    const unparseable = makeLine(OTHER_PRICE_ID, 9999, 1);
    const valid = makeLine(STANDARD_PRICE_ID, 2395, 1);
    expect(planLine([unparseable, valid], map)).toBe(valid);
  });

  it('returns null when every line maps to a non-mathew lookup key', () => {
    const OTHER_PRICE_ID = 'price_other_product';
    const OTHER_KEY = 'some_other_product_key';
    const map = makeMap({ [OTHER_PRICE_ID]: OTHER_KEY });

    // Only a line with an unrecognised key — parseLookupKey must stop it.
    const unparseable = makeLine(OTHER_PRICE_ID, 9999, 1);
    expect(planLine([unparseable], map)).toBeNull();
  });
});

describe('foldPricePage', () => {
  function makePrice(id: string, lookupKey: string | null): Stripe.Price {
    return {
      id,
      object: 'price',
      lookup_key: lookupKey,
      active: true,
      billing_scheme: 'per_unit',
      created: 0,
      currency: 'gbp',
      custom_unit_amount: null,
      livemode: false,
      metadata: {},
      nickname: null,
      product: 'prod_any',
      recurring: null,
      tax_behavior: null,
      tiers_mode: null,
      transform_quantity: null,
      type: 'one_time',
      unit_amount: null,
      unit_amount_decimal: null,
    };
  }

  it('maps price ids to their lookup keys', () => {
    const prices = [
      makePrice('price_a', 'mathew_standard_monthly_v1'),
      makePrice('price_b', 'mathew_platinum_monthly_v1'),
    ];
    const result = foldPricePage(prices);
    expect(result.get('price_a')).toBe('mathew_standard_monthly_v1');
    expect(result.get('price_b')).toBe('mathew_platinum_monthly_v1');
  });

  it('skips prices with a null lookup_key', () => {
    const prices = [
      makePrice('price_with_key', 'mathew_standard_monthly_v1'),
      makePrice('price_no_key', null),
    ];
    const result = foldPricePage(prices);
    expect(result.size).toBe(1);
    expect(result.has('price_no_key')).toBe(false);
  });

  it('returns an empty map for an empty page', () => {
    expect(foldPricePage([])).toEqual(new Map());
  });

  // buildPriceKeyMap folds page after page into one accumulator. If this
  // stopped carrying earlier pages forward, every price past the first 100
  // would be unresolvable and those invoices would vanish from the table.
  it('accumulates across pages', () => {
    const first = foldPricePage([makePrice('price_a', 'mathew_standard_monthly_v1')]);
    const second = foldPricePage([makePrice('price_b', 'mathew_platinum_annual_v1')], first);
    expect(second.get('price_a')).toBe('mathew_standard_monthly_v1');
    expect(second.get('price_b')).toBe('mathew_platinum_annual_v1');
    expect(second.size).toBe(2);
  });
});
