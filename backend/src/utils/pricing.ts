/**
 * Single source of truth for what a nursery listing costs.
 *
 * Three products:
 *
 *   Single Standard  — one nursery, £23.95/mo
 *   Single Platinum  — one nursery, £38.60/mo
 *   Group            — two or more, Platinum features at a volume discount
 *
 * "Group" is not a tier of its own. It is the Platinum tier bought for more
 * than one nursery, which is why the band rates are 10/20/30/40% off the
 * single Platinum rate. There is no Standard group.
 *
 * The total is the per-nursery rate times the nursery count. Annual is the
 * monthly rate x 12; paying yearly earns no further discount.
 *
 * Prices are in pence to keep away from floating point — Stripe wants pence
 * anyway. The frontend mirrors this table for display only; this file is what
 * actually gets charged.
 */

export type PlanTier = 'standard' | 'platinum';
export type BillingPeriod = 'monthly' | 'annual';

/** One nursery, standard features. */
export const SINGLE_STANDARD_MONTHLY_PENCE = 2395;

/** One nursery, platinum features. The base the group bands discount from. */
export const SINGLE_PLATINUM_MONTHLY_PENCE = 3860;

/** Group size at or above which pricing is negotiated rather than self-serve. */
export const BESPOKE_THRESHOLD = 61;

/** The smallest group. One nursery is a Single, not a Group. */
export const MIN_GROUP_SIZE = 2;

export interface GroupBand {
  min: number;
  max: number;
  /** Per-nursery monthly rate, in pence. */
  unitPence: number;
  /** Headline discount, for display only — the rate above is authoritative. */
  discountPercent: number;
}

export const GROUP_BANDS: readonly GroupBand[] = [
  { min: 2, max: 5, unitPence: 3474, discountPercent: 10 },
  { min: 6, max: 15, unitPence: 3088, discountPercent: 20 },
  { min: 16, max: 30, unitPence: 2702, discountPercent: 30 },
  { min: 31, max: 60, unitPence: 2316, discountPercent: 40 },
];

export function findGroupBand(nurseryCount: number): GroupBand | null {
  return GROUP_BANDS.find((b) => nurseryCount >= b.min && nurseryCount <= b.max) ?? null;
}

/**
 * Bumped by hand whenever any amount above changes.
 *
 * Stripe Prices are immutable — a unit_amount or tier ladder cannot be edited
 * after creation — so a price change is a new Price, and a new Price needs a
 * new lookup key. Keeping the version explicit rather than hashing the table
 * keeps the keys readable and stops cosmetic edits from churning the
 * catalogue. `price-catalogue.test.ts` fails if the table moves and this
 * does not.
 *
 * Existing subscribers stay on the Price they bought until deliberately
 * migrated, so grandfathering is the default rather than something to
 * remember.
 */
export const PRICE_VERSION = 1;

/** A Stripe volume tier. `up_to` is inclusive; the last tier must be 'inf'. */
export interface StripeTier {
  up_to: number | 'inf';
  unit_amount: number;
}

const perPeriod = (monthlyPence: number, billing: BillingPeriod): number =>
  billing === 'annual' ? monthlyPence * 12 : monthlyPence;

/**
 * The band table as a Stripe volume ladder.
 *
 * Tier one is the single Platinum rate, because a group of one is a Single —
 * quantity 1 on this ladder and the standalone Single Platinum price are the
 * same product at the same money. The trailing 'inf' tier exists only because
 * Stripe requires the last tier to be unbounded; it repeats the top rate so a
 * group of 61 can never come out cheaper than a group of 60. Anything at or
 * above BESPOKE_THRESHOLD is refused by `quote()` long before it reaches
 * Stripe, and that refusal is the only thing preventing a self-serve group
 * of 200.
 */
export function toStripeTiers(
  bands: readonly GroupBand[],
  billing: BillingPeriod
): StripeTier[] {
  const ladder: StripeTier[] = [
    { up_to: 1, unit_amount: perPeriod(SINGLE_PLATINUM_MONTHLY_PENCE, billing) },
    ...bands.map((band) => ({
      up_to: band.max,
      unit_amount: perPeriod(band.unitPence, billing),
    })),
  ];
  const top = ladder[ladder.length - 1];
  return [...ladder, { up_to: 'inf', unit_amount: top.unit_amount }];
}

/**
 * The flat amount for a non-tiered Price. Standard is flat because a Standard
 * account covers one nursery by definition — there is no ladder to express.
 * Platinum's flat amount is only used for verification against tier one.
 */
export function flatAmountPence(tier: PlanTier, billing: BillingPeriod): number {
  const monthly =
    tier === 'platinum' ? SINGLE_PLATINUM_MONTHLY_PENCE : SINGLE_STANDARD_MONTHLY_PENCE;
  return perPeriod(monthly, billing);
}

export function priceLookupKey(tier: PlanTier, billing: BillingPeriod): string {
  return `mathew_${tier}_${billing}_v${PRICE_VERSION}`;
}

const LOOKUP_KEY_RE = /^mathew_(standard|platinum)_(monthly|annual)_v(\d+)$/;

/**
 * Reads a lookup key back into a tier and a billing period, at any version.
 *
 * This is how a subscription says which plan it is: the Price on the item
 * carries the key, so nothing has to trust metadata. Returns null rather than
 * defaulting, because a key we do not recognise means a Price nobody here
 * created, and silently calling that "standard" would downgrade a paying
 * customer.
 */
export function parseLookupKey(
  key: string | null | undefined
): { tier: PlanTier; billing: BillingPeriod } | null {
  const match = LOOKUP_KEY_RE.exec(key ?? '');
  if (!match) return null;
  return { tier: match[1] as PlanTier, billing: match[2] as BillingPeriod };
}

export interface PriceQuote {
  tier: PlanTier;
  billing: BillingPeriod;
  /** How many nurseries this subscription covers. */
  quantity: number;
  /** Charged per nursery, per billing period, in pence. */
  unitAmountPence: number;
  /** unitAmountPence x quantity. */
  totalPence: number;
  discountPercent: number;
  /** Derived, never stored: two or more nurseries is a Group. */
  isGroup: boolean;
}

export class PricingError extends Error {}

/**
 * Works out what to charge. Throws rather than falling back to a default —
 * a wrong price is worse than a failed checkout.
 */
export function quote(
  tier: PlanTier,
  billing: BillingPeriod,
  nurseryCount: number
): PriceQuote {
  if (!Number.isInteger(nurseryCount) || nurseryCount < 1) {
    throw new PricingError('Number of nurseries must be a whole number of at least 1.');
  }

  let unitMonthlyPence: number;
  let discountPercent: number;
  const isGroup = nurseryCount >= MIN_GROUP_SIZE;

  if (!isGroup) {
    unitMonthlyPence =
      tier === 'platinum' ? SINGLE_PLATINUM_MONTHLY_PENCE : SINGLE_STANDARD_MONTHLY_PENCE;
    discountPercent = 0;
  } else {
    if (tier !== 'platinum') {
      throw new PricingError(
        'A Group covers two or more nurseries and includes Platinum features. ' +
          'The Standard plan is for a single nursery.'
      );
    }
    if (nurseryCount >= BESPOKE_THRESHOLD) {
      throw new PricingError(
        `Groups of ${BESPOKE_THRESHOLD} or more are priced individually — please get in touch.`
      );
    }

    const band = findGroupBand(nurseryCount);
    if (!band) {
      // Unreachable while the bands stay contiguous, but a silent wrong price
      // is exactly what this module exists to prevent.
      throw new PricingError('No price band matches that number of nurseries.');
    }
    unitMonthlyPence = band.unitPence;
    discountPercent = band.discountPercent;
  }

  const unitAmountPence =
    billing === 'annual' ? unitMonthlyPence * 12 : unitMonthlyPence;

  return {
    tier,
    billing,
    quantity: nurseryCount,
    unitAmountPence,
    totalPence: unitAmountPence * nurseryCount,
    discountPercent,
    isGroup,
  };
}

const formatGbp = (pence: number) => `£${(pence / 100).toFixed(2)}`;

/** Line item label and invoice description shown to the customer. */
export function describeQuote(q: PriceQuote): { label: string; description: string } {
  const productLabel = q.isGroup
    ? `Group Nursery Listing (${q.quantity} nurseries)`
    : q.tier === 'platinum'
      ? 'Single Platinum Nursery Listing'
      : 'Single Standard Nursery Listing';
  const periodLabel = q.billing === 'annual' ? 'Annual' : 'Monthly';
  const perNursery = formatGbp(q.unitAmountPence);
  const total = formatGbp(q.totalPence);
  const per = q.billing === 'annual' ? 'year' : 'month';

  const sites = q.quantity === 1 ? '1 nursery' : `${q.quantity} nurseries`;
  const discountNote =
    q.discountPercent > 0 ? ` Includes a ${q.discountPercent}% group discount.` : '';
  const annualNote = q.billing === 'annual' ? ' Paid upfront each year.' : '';

  return {
    label: `${productLabel} – ${periodLabel}`,
    description:
      `${sites} at ${perNursery} per nursery per ${per} — ${total} per ${per}.` +
      `${discountNote}${annualNote}` +
      ' Recurring subscription — 90 days written notice required before renewal date to cancel.',
  };
}
