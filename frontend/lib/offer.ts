/**
 * Mirrors backend/src/utils/offer.ts.
 *
 * This gate is cosmetic — it stops the site advertising something Checkout
 * will refuse to honour. The backend decides eligibility for real; a stale
 * build here costs a confusing message, never a free subscription.
 *
 * Note it answers "is the offer running", not "does this visitor get it".
 * The backend also excludes accounts that have already had a term, which the
 * browser cannot know before signup.
 */

export function offerIsOpen(now: Date = new Date()): boolean {
  const endsAt = process.env.NEXT_PUBLIC_OFFER_ENDS_AT;
  if (!endsAt) return false;
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return false;
  return now < end;
}
