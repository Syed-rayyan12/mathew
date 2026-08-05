/**
 * The launch offer: six months at £0 for visitors arriving through the
 * homepage CTA.
 *
 * The code travels in a URL, so it is public and forgeable by anyone who
 * reads it. That was accepted rather than solved — the account cannot exist
 * before Checkout (the webhook creates it from session metadata), so there is
 * no row to bind the offer to beforehand. The controls that remain are this
 * server-side window and the twelve-month term, which still yields six paid
 * months on a leaked signup.
 */

import { config } from '../config';

/** One campaign, one code. */
export const OFFER_CODE = 'launch6';

export function isOfferEligible(code: unknown, now: Date = new Date()): boolean {
  if (typeof code !== 'string' || code !== OFFER_CODE) return false;
  if (!config.offer.endsAt) return false;
  const endsAt = new Date(config.offer.endsAt);
  if (Number.isNaN(endsAt.getTime())) return false;
  return now < endsAt;
}
