/**
 * Display-side mirror of backend/src/utils/pricing.ts.
 *
 * This exists so the page can show a running total as someone drags the
 * nursery count around, without a round trip per keystroke. It is NOT what
 * gets charged — the server re-derives the price from the nursery count on
 * every checkout, and ignores anything the client says about money.
 *
 * If you change a band here, change it there too.
 */

export type PlanKey = 'standard' | 'platinum';
export type BillingPeriod = 'monthly' | 'annual';

/** What users see. Internal keys stay standard/platinum for Stripe and the DB. */
export const PLAN_LABEL: Record<PlanKey, string> = {
  standard: 'Single',
  platinum: 'Group',
};

export const SINGLE_MONTHLY_PENCE = 2395;
export const BESPOKE_THRESHOLD = 61;
export const MIN_GROUP_SIZE = 2;
/** Largest group that can check out without talking to a human. */
export const MAX_SELF_SERVE_GROUP = BESPOKE_THRESHOLD - 1;

export interface GroupBand {
  min: number;
  max: number;
  unitPence: number;
  discountPercent: number;
}

export const GROUP_BANDS: readonly GroupBand[] = [
  { min: 2, max: 5, unitPence: 3474, discountPercent: 10 },
  { min: 6, max: 15, unitPence: 3088, discountPercent: 20 },
  { min: 16, max: 30, unitPence: 2702, discountPercent: 30 },
  { min: 31, max: 60, unitPence: 2316, discountPercent: 40 },
];

export const findGroupBand = (count: number): GroupBand | undefined =>
  GROUP_BANDS.find((b) => count >= b.min && count <= b.max);

export const isBespoke = (count: number) => count >= BESPOKE_THRESHOLD;

export const formatGbp = (pence: number) =>
  `£${(pence / 100).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export interface DisplayQuote {
  /** Per nursery, per billing period. */
  unitPence: number;
  totalPence: number;
  discountPercent: number;
  /** True when the group is too large to self-serve. */
  bespoke: boolean;
}

export function priceFor(
  plan: PlanKey,
  billing: BillingPeriod,
  nurseryCount: number
): DisplayQuote {
  const months = billing === 'annual' ? 12 : 1;

  if (plan === 'standard') {
    const unitPence = SINGLE_MONTHLY_PENCE * months;
    return { unitPence, totalPence: unitPence, discountPercent: 0, bespoke: false };
  }

  if (isBespoke(nurseryCount)) {
    return { unitPence: 0, totalPence: 0, discountPercent: 50, bespoke: true };
  }

  const band = findGroupBand(nurseryCount);
  if (!band) {
    return { unitPence: 0, totalPence: 0, discountPercent: 0, bespoke: false };
  }

  const unitPence = band.unitPence * months;
  return {
    unitPence,
    totalPence: unitPence * nurseryCount,
    discountPercent: band.discountPercent,
    bespoke: false,
  };
}
