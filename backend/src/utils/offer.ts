/**
 * The free-months offer: six months at £0 on a new subscription.
 *
 * Open to anyone while the window is open — there is no code to present and
 * no campaign link to arrive through. `OFFER_ENDS_AT` is the only control,
 * and unsetting it closes the offer without a deploy.
 *
 * The one limit is one trial per account (see `alreadyHadTrial`). Without it
 * an owner could cancel and resubscribe for another six free months
 * indefinitely, which is a permanently free product rather than an offer.
 */

import { config } from '../config';

/** Recorded on the account that took the offer, for reporting. */
export const OFFER_CODE = 'launch6';

/** Whether the offer window is currently open. */
export function offerIsOpen(now: Date = new Date()): boolean {
  if (!config.offer.endsAt) return false;
  const endsAt = new Date(config.offer.endsAt);
  if (Number.isNaN(endsAt.getTime())) return false;
  return now < endsAt;
}

/**
 * Whether this account has already had a plan subscription.
 *
 * `minimumTermEnd` is written once when a subscription starts and is never
 * cleared — not even by clearSubscription — so a non-null value is a durable
 * record that the account has subscribed before. That makes it the trial
 * marker too, with no extra column.
 */
export function alreadyHadTrial(
  user: { minimumTermEnd: Date | null } | null | undefined
): boolean {
  return Boolean(user?.minimumTermEnd);
}

/** The full decision: window open, and this account has not had one before. */
export function offerAppliesTo(
  user: { minimumTermEnd: Date | null } | null | undefined,
  now: Date = new Date()
): boolean {
  return offerIsOpen(now) && !alreadyHadTrial(user);
}
