/**
 * A subscription is the plan.
 *
 * The item's Price says which tier, its quantity says how many nurseries. That
 * makes this the only thing that needs reading to know what an account has
 * bought — no metadata, nothing the client ever influenced, and no replay
 * ledger, because re-running it re-reads current truth and writes the same
 * values.
 */

import Stripe from 'stripe';
import prisma from '../config/database';
import { getStripe } from './stripe';
import { parseLookupKey, type PlanTier } from './pricing';

export interface SubscriptionSnapshot {
  planTier: PlanTier;
  paidNurseryCount: number;
  subscriptionStatus: string;
  currentPeriodEnd: Date | null;
  cancelAt: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
}

/** A subscription that could not have been sold by this application. */
export class SubscriptionShapeError extends Error {}

const secondsToDate = (seconds: number | null | undefined): Date | null =>
  typeof seconds === 'number' ? new Date(seconds * 1000) : null;

const customerId = (customer: Stripe.Subscription['customer']): string | null => {
  if (!customer) return null;
  return typeof customer === 'string' ? customer : customer.id;
};

/**
 * Pure translation. Throws rather than defaulting on anything it does not
 * recognise: a Price nobody here created, or a second line item, means the
 * subscription was assembled somewhere else, and quietly calling it Standard
 * would silently downgrade a paying customer.
 */
export function readSubscription(sub: Stripe.Subscription): SubscriptionSnapshot {
  const items = sub.items?.data ?? [];

  if (items.length !== 1) {
    throw new SubscriptionShapeError(
      `Subscription ${sub.id} has ${items.length} items; every plan sold here has exactly one.`
    );
  }

  const item = items[0];
  const parsed = parseLookupKey(item.price?.lookup_key);

  if (!parsed) {
    throw new SubscriptionShapeError(
      `Subscription ${sub.id} is on price ${item.price?.id ?? 'unknown'}, which has no ` +
        'recognised lookup key. It was not created by this application.'
    );
  }

  return {
    planTier: parsed.tier,
    paidNurseryCount: item.quantity ?? 1,
    subscriptionStatus: sub.status,
    // This API version keeps the period end on the item, not the subscription.
    currentPeriodEnd: secondsToDate(item.current_period_end),
    cancelAt: secondsToDate(sub.cancel_at),
    stripeCustomerId: customerId(sub.customer),
    stripeSubscriptionId: sub.id,
  };
}

/**
 * Re-fetches the subscription and writes it onto the account.
 *
 * Re-fetches rather than trusting a webhook payload because Stripe does not
 * guarantee event ordering, so a stale `subscription.updated` could otherwise
 * overwrite a newer one. One extra API call per event at this volume, and
 * every write is current truth by construction.
 */
export async function reconcileFromSubscription(
  subscriptionId: string,
  userId: string
): Promise<SubscriptionSnapshot> {
  const sub = await getStripe().subscriptions.retrieve(subscriptionId);
  const snapshot = readSubscription(sub);

  await prisma.user.update({
    where: { id: userId },
    data: {
      planTier: snapshot.planTier,
      paidNurseryCount: snapshot.paidNurseryCount,
      subscriptionStatus: snapshot.subscriptionStatus,
      currentPeriodEnd: snapshot.currentPeriodEnd,
      cancelAt: snapshot.cancelAt,
      stripeCustomerId: snapshot.stripeCustomerId,
      stripeSubscriptionId: snapshot.stripeSubscriptionId,
    },
  });

  return snapshot;
}

/**
 * Marks an account as no longer subscribed, keeping what it used to have.
 *
 * planTier and paidNurseryCount are deliberately left alone so admin can still
 * see that a lapsed account bought a Group of eight. isLive() is what hides
 * the listings.
 */
export async function clearSubscription(userId: string, status: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionStatus: status, cancelAt: null },
  });
}
