/**
 * Sync for the jobs add-on subscription.
 *
 * Deliberately parallel to subscription-sync.ts, sharing no code with it.
 * Mixing them is how a £5.99 add-on change ends up breaking plan billing.
 */

import Stripe from 'stripe';
import prisma from '../config/database';
import { getStripe } from './stripe';
import { parseJobsAddonLookupKey } from './pricing';
import { SubscriptionShapeError } from './subscription-sync';

export interface JobsAddonSnapshot {
  jobsAddonStatus: string;
  jobsAddonCurrentPeriodEnd: Date | null;
  jobsAddonCancelAt: Date | null;
  jobsAddonSubscriptionId: string;
}

const secondsToDate = (seconds: number | null | undefined): Date | null =>
  typeof seconds === 'number' ? new Date(seconds * 1000) : null;

/**
 * Pure translation. Throws on anything it does not recognise — a plan key,
 * multiple items, or no items — so the plan billing path can never write
 * into the add-on columns and vice versa.
 */
export function readJobsAddonSubscription(
  sub: Stripe.Subscription
): JobsAddonSnapshot {
  const items = sub.items?.data ?? [];

  if (items.length !== 1) {
    throw new SubscriptionShapeError(
      `Add-on subscription ${sub.id} has ${items.length} items; the jobs add-on has exactly one.`
    );
  }

  const item = items[0];
  const parsed = parseJobsAddonLookupKey(item.price?.lookup_key);

  if (!parsed) {
    throw new SubscriptionShapeError(
      `Subscription ${sub.id} is on price ${item.price?.id ?? 'unknown'}, which has no ` +
        'recognised add-on lookup key. It was not created as a jobs add-on.'
    );
  }

  return {
    jobsAddonStatus: sub.status,
    jobsAddonCurrentPeriodEnd: secondsToDate(item.current_period_end),
    jobsAddonCancelAt: secondsToDate(sub.cancel_at),
    jobsAddonSubscriptionId: sub.id,
  };
}

/**
 * Re-fetches the subscription from Stripe and writes to the user's add-on
 * columns. Same re-fetch pattern as reconcileFromSubscription, same reason:
 * Stripe does not guarantee event ordering.
 */
export async function reconcileJobsAddon(
  subscriptionId: string,
  userId: string
): Promise<JobsAddonSnapshot> {
  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const snapshot = readJobsAddonSubscription(sub);

  await prisma.user.update({
    where: { id: userId },
    data: {
      jobsAddonStatus: snapshot.jobsAddonStatus,
      jobsAddonCurrentPeriodEnd: snapshot.jobsAddonCurrentPeriodEnd,
      jobsAddonCancelAt: snapshot.jobsAddonCancelAt,
      jobsAddonSubscriptionId: snapshot.jobsAddonSubscriptionId,
    },
  });

  return snapshot;
}

/**
 * Marks the add-on as ended. Leaves jobsAddonMinimumTermEnd for the record.
 */
export async function clearJobsAddon(
  userId: string,
  status: string
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      jobsAddonStatus: status,
      jobsAddonCancelAt: null,
      jobsAddonCurrentPeriodEnd: null,
    },
  });
}
