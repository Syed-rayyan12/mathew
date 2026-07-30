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

import { type PlanTier, JOBS_ADDON_ACTIVE_LIMIT } from './pricing';

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

/**
 * The statuses that keep a listing on the site.
 *
 * past_due is here on purpose. Stripe's card retries run for roughly three
 * weeks, and an expired card should not pull a nursery off the site before
 * anyone has had a chance to fix it. The dashboard warns during that window.
 */
export const LIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due'] as const;

export interface BillingAccount {
  subscriptionStatus: string | null;
}

export interface JobsAddonAccount {
  jobsAddonStatus: string | null;
}

export function hasJobsAddon(account: JobsAddonAccount): boolean {
  return (LIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(
    account.jobsAddonStatus ?? ''
  );
}

/** Is this account currently paid for? Unknown is never treated as paid. */
export function isLive(account: BillingAccount): boolean {
  return (LIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(
    account.subscriptionStatus ?? ''
  );
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

export function features(account: PlanAccount & Partial<JobsAddonAccount>): PlanFeatures {
  const unlocked = normaliseTier(account.planTier) === 'platinum';
  return {
    jobs: unlocked || hasJobsAddon({ jobsAddonStatus: account.jobsAddonStatus ?? null }),
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

/**
 * Both questions at once: is there headroom, and is the plan paid for.
 *
 * The AND lives here rather than inside allowance() so that admin can still
 * see that a lapsed account bought eight nurseries.
 */
export function canAddNursery(
  account: PlanAccount & BillingAccount,
  usedCount: number
): boolean {
  return isLive(account) && allowance(account, usedCount).remaining > 0;
}

/**
 * How many jobs may be active at once. null means unlimited.
 * Platinum is unlimited. Add-on is JOBS_ADDON_ACTIVE_LIMIT. Neither is 0.
 */
export function activeJobLimit(
  account: PlanAccount & JobsAddonAccount
): number | null {
  if (normaliseTier(account.planTier) === 'platinum') return null;
  if (hasJobsAddon(account)) return JOBS_ADDON_ACTIVE_LIMIT;
  return 0;
}

