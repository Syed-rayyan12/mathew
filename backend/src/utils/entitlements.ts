/**
 * What an account is allowed to do.
 *
 * Two independent questions, answered from one column each:
 *
 *   features()  reads planTier          — which capabilities are unlocked
 *   allowance() reads paidNurseryCount  — how many nurseries may exist
 *
 * Keeping them separate means changing tier cannot move the limit, and buying
 * more nurseries cannot change what is unlocked.
 *
 * "Group" is derived, never stored, so it cannot contradict the count.
 */

import { MIN_GROUP_SIZE, type PlanTier } from './pricing';

/**
 * Structural rather than Prisma's User so callers can pass a narrow `select`
 * and tests can pass a literal.
 */
export interface PlanAccount {
  planTier: string | null;
  paidNurseryCount: number | null;
}

export interface PlanFeatures {
  jobs: boolean;
  video: boolean;
  teamMembers: boolean;
  reviewModeration: boolean;
  priorityPlacement: boolean;
  analytics: boolean;
}

export interface Allowance {
  paid: number;
  used: number;
  /** Never negative — an over-limit account has no headroom, not minus some. */
  remaining: number;
}

/** Anything unrecognised is standard. Unknown must never grant platinum. */
export function normaliseTier(tier: string | null | undefined): PlanTier {
  return tier === 'platinum' ? 'platinum' : 'standard';
}

export function paidCount(account: PlanAccount): number {
  const n = account.paidNurseryCount;
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 ? n : 1;
}

export function isGroup(account: PlanAccount): boolean {
  return paidCount(account) >= 2;
}

/** The one place plan wording is decided, so no two screens can disagree. */
export function planLabel(account: PlanAccount): string {
  const paid = paidCount(account);
  if (paid >= 2) return `Group of ${paid}`;
  return normaliseTier(account.planTier) === 'platinum'
    ? 'Single Platinum'
    : 'Single Standard';
}

export function features(account: PlanAccount): PlanFeatures {
  const unlocked = normaliseTier(account.planTier) === 'platinum';
  return {
    jobs: unlocked,
    video: unlocked,
    teamMembers: unlocked,
    reviewModeration: unlocked,
    priorityPlacement: unlocked,
    analytics: unlocked,
  };
}

export function allowance(account: PlanAccount, usedCount: number): Allowance {
  const paid = paidCount(account);
  const used = Math.max(0, usedCount);
  return { paid, used, remaining: Math.max(0, paid - used) };
}

export function canAddNursery(account: PlanAccount, usedCount: number): boolean {
  return allowance(account, usedCount).remaining > 0;
}

/**
 * Turns Stripe Checkout Session metadata into the two columns.
 *
 * Metadata is a round trip through a third party, so it is untrusted input.
 * A group is Platinum by definition — pricing.ts refuses to quote a Standard
 * group at all — so a count of two or more forces the tier rather than letting
 * a combination land in the database that could never have been sold.
 */
export function planFromMetadata(meta: {
  plan?: string;
  nurseryCount?: string;
}): { tier: PlanTier; count: number } {
  const parsed = Number(meta.nurseryCount);
  const count = Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  const tier: PlanTier =
    count >= MIN_GROUP_SIZE ? 'platinum' : normaliseTier(meta.plan);
  return { tier, count };
}
