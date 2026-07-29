/**
 * Single source of truth for what a nursery listing costs.
 *
 * Two plans, shown to users as "Single" and "Group". The internal keys stay
 * `standard` / `platinum` because they are written into Stripe product
 * metadata and the User.plan column — renaming them would orphan live
 * subscriptions for the sake of a label.
 *
 *   Single (standard)  — one nursery only, £23.95/mo, no banding
 *   Group  (platinum)  — two or more, with a volume discount by group size
 *
 * The group price is a per-nursery rate that steps down as the group grows.
 * The total is simply rate x number of nurseries. Annual is the monthly rate
 * x 12; paying yearly earns no further discount.
 *
 * Prices are in pence to keep away from floating point — Stripe wants pence
 * anyway. The frontend mirrors this table for display only; this file is what
 * actually gets charged.
 */

export type PlanKey = 'standard' | 'platinum';
export type BillingPeriod = 'monthly' | 'annual';

/** Per-nursery monthly rate for a single-site listing. */
export const SINGLE_MONTHLY_PENCE = 2395;

/** Group size at or above which pricing is negotiated rather than self-serve. */
export const BESPOKE_THRESHOLD = 61;

/** The smallest group. One nursery is a Single, not a Group. */
export const MIN_GROUP_SIZE = 2;

interface GroupBand {
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

export interface PriceQuote {
  planKey: PlanKey;
  billing: BillingPeriod;
  /** How many nurseries this subscription covers. */
  quantity: number;
  /** Charged per nursery, per billing period, in pence. */
  unitAmountPence: number;
  /** unitAmountPence x quantity. */
  totalPence: number;
  discountPercent: number;
}

export class PricingError extends Error {}

/**
 * Works out what to charge. Throws rather than falling back to a default —
 * a wrong price is worse than a failed checkout.
 */
export function quote(
  planKey: PlanKey,
  billing: BillingPeriod,
  nurseryCount: number
): PriceQuote {
  if (!Number.isInteger(nurseryCount) || nurseryCount < 1) {
    throw new PricingError('Number of nurseries must be a whole number of at least 1.');
  }

  let unitMonthlyPence: number;
  let discountPercent: number;

  if (planKey === 'standard') {
    if (nurseryCount !== 1) {
      throw new PricingError(
        'The Single plan covers one nursery. Please choose the Group plan for more than one.'
      );
    }
    unitMonthlyPence = SINGLE_MONTHLY_PENCE;
    discountPercent = 0;
  } else {
    if (nurseryCount < MIN_GROUP_SIZE) {
      throw new PricingError('The Group plan starts at two nurseries.');
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
    planKey,
    billing,
    quantity: nurseryCount,
    unitAmountPence,
    totalPence: unitAmountPence * nurseryCount,
    discountPercent,
  };
}

const formatGbp = (pence: number) => `£${(pence / 100).toFixed(2)}`;

/** Line item label and description shown on Stripe Checkout and the invoice. */
export function describeQuote(q: PriceQuote): { label: string; description: string } {
  const planLabel = q.planKey === 'standard' ? 'Single' : 'Group';
  const periodLabel = q.billing === 'annual' ? 'Annual' : 'Monthly';
  const perNursery = formatGbp(q.unitAmountPence);
  const total = formatGbp(q.totalPence);
  const per = q.billing === 'annual' ? 'year' : 'month';

  const sites =
    q.quantity === 1 ? '1 nursery' : `${q.quantity} nurseries`;
  const discountNote =
    q.discountPercent > 0 ? ` Includes a ${q.discountPercent}% group discount.` : '';
  const annualNote =
    q.billing === 'annual'
      ? ' Paid upfront each year.'
      : '';

  return {
    label: `${planLabel} Nursery Listing – ${periodLabel}`,
    description:
      `${sites} at ${perNursery} per nursery per ${per} — ${total} per ${per}.` +
      `${discountNote}${annualNote}` +
      ' Recurring subscription — 90 days written notice required before renewal date to cancel.',
  };
}
