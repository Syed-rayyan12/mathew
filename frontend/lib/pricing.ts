/**
 * Display-side mirror of backend/src/utils/pricing.ts.
 *
 * This exists so the page can show a running total as someone drags the
 * nursery count around, without a round trip per keystroke. It is NOT what
 * gets charged — the server re-derives the price from the nursery count on
 * every checkout, and ignores anything the client says about money.
 *
 * backend/src/utils/pricing-parity.test.ts fails if this file drifts.
 */

export type PlanTier = 'standard' | 'platinum';
export type BillingPeriod = 'monthly' | 'annual';

export const SINGLE_STANDARD_MONTHLY_PENCE = 2395;
export const SINGLE_PLATINUM_MONTHLY_PENCE = 3860;
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

/** Mirrors entitlements.planLabel() on the server. */
export const planLabel = (tier: PlanTier, nurseryCount: number): string => {
  if (nurseryCount >= MIN_GROUP_SIZE) return `Group of ${nurseryCount}`;
  return tier === 'platinum' ? 'Single Platinum' : 'Single Standard';
};

export interface DisplayQuote {
  /** Per nursery, per billing period. */
  unitPence: number;
  totalPence: number;
  discountPercent: number;
  /** True when the group is too large to self-serve. */
  bespoke: boolean;
  isGroup: boolean;
}

export function priceFor(
  tier: PlanTier,
  billing: BillingPeriod,
  nurseryCount: number
): DisplayQuote {
  const months = billing === 'annual' ? 12 : 1;
  const isGroup = nurseryCount >= MIN_GROUP_SIZE;

  if (!isGroup) {
    const unitPence =
      (tier === 'platinum' ? SINGLE_PLATINUM_MONTHLY_PENCE : SINGLE_STANDARD_MONTHLY_PENCE) *
      months;
    return { unitPence, totalPence: unitPence, discountPercent: 0, bespoke: false, isGroup: false };
  }

  if (isBespoke(nurseryCount)) {
    return { unitPence: 0, totalPence: 0, discountPercent: 0, bespoke: true, isGroup: true };
  }

  const band = findGroupBand(nurseryCount);
  if (!band) {
    return { unitPence: 0, totalPence: 0, discountPercent: 0, bespoke: false, isGroup: true };
  }

  const unitPence = band.unitPence * months;
  return {
    unitPence,
    totalPence: unitPence * nurseryCount,
    discountPercent: band.discountPercent,
    bespoke: false,
    isGroup: true,
  };
}
