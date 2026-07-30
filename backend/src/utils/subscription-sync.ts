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
import { parseLookupKey, quote, PricingError, type PlanTier } from './pricing';
import { isLive, LIVE_SUBSCRIPTION_STATUSES } from './entitlements';

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
 *
 * A5: also validates the quantity against quote() to catch manual Stripe
 * dashboard changes that bypass the API's pricing guard.
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

  // A5: validate quantity — quote() refuses a Standard group and refuses 61+.
  // A manual Stripe dashboard change bypasses the API guard; catching it here
  // means the webhook treats it as non-retryable (SubscriptionShapeError).
  const quantity = item.quantity ?? 1;
  try {
    quote(parsed.tier, parsed.billing, quantity);
  } catch (err) {
    if (err instanceof PricingError) {
      throw new SubscriptionShapeError(
        `Subscription ${sub.id} has tier ${parsed.tier} with quantity ${quantity}, which is not a valid combination: ${err.message}`
      );
    }
    throw err;
  }

  return {
    planTier: parsed.tier,
    paidNurseryCount: quantity,
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
 * The incoming subscriptionId is a *candidate*, not a command. If the account
 * already has a different live subscription recorded, this function decides
 * which one to keep (the one created first) and cancels the other. The
 * function returns the snapshot it actually wrote, which may reflect a
 * different id than the one passed in.
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
  const stripe = getStripe();

  // A1b: before writing, check if the account already has a different recorded
  // subscription. If it is live, we have a duplicate — keep the older one and
  // cancel the newer.
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeSubscriptionId: true, subscriptionStatus: true },
  });

  let resolvedId = subscriptionId;

  if (
    account?.stripeSubscriptionId &&
    account.stripeSubscriptionId !== subscriptionId
  ) {
    const recorded = await stripe.subscriptions.retrieve(account.stripeSubscriptionId);

    if ((LIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(recorded.status)) {
      // Both subscriptions are live — keep the one created first.
      const incoming = await stripe.subscriptions.retrieve(subscriptionId);
      const keepId =
        recorded.created <= incoming.created ? account.stripeSubscriptionId : subscriptionId;
      const cancelId =
        keepId === account.stripeSubscriptionId ? subscriptionId : account.stripeSubscriptionId;

      // This is a money event — it must be visible in logs.
      console.error(
        `❌ Duplicate live subscription detected for user ${userId}: ` +
          `keeping ${keepId}, cancelling ${cancelId} (recorded ${account.stripeSubscriptionId}, incoming ${subscriptionId})`
      );

      await stripe.subscriptions.cancel(cancelId, { prorate: true, invoice_now: true } as any);
      resolvedId = keepId;
    }
    // If the recorded subscription is not live, this is a normal reactivation —
    // proceed and overwrite with the incoming id.
  }

  const sub = await stripe.subscriptions.retrieve(resolvedId);
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
 *
 * A6: currentPeriodEnd is nulled out so the admin "Renews" column does not
 * show a stale renewal date for a cancelled account.
 */
export async function clearSubscription(userId: string, status: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionStatus: status, cancelAt: null, currentPeriodEnd: null },
  });
}
