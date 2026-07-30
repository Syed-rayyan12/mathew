/**
 * Who the public can see.
 *
 * A survey of the backend found six public nursery queries, none sharing a
 * filter. This is the one place that answers the question, so hiding a lapsed
 * account's listings is a single edit rather than six that have to agree.
 *
 * Nursery.ownerId is non-nullable, so every nursery joins to a user and the
 * relation filter can never silently match nothing.
 *
 * Group.ownerId is also non-nullable. Group has no isApproved field, so the
 * group fragment only checks the owner — but the same ADMIN pass-through
 * applies, because admin accounts carry no subscription.
 */

import { LIVE_SUBSCRIPTION_STATUSES } from './entitlements';

/**
 * The owner condition shared by nursery and group visibility.
 *
 * An admin account has no subscription and must never be gated by one.
 * A paying owner must have a live subscription status.
 */
const PAYING_OWNER = {
  OR: [
    { role: 'ADMIN' as const },
    { subscriptionStatus: { in: [...LIVE_SUBSCRIPTION_STATUSES] } },
  ],
};

export const PUBLIC_NURSERY_WHERE = {
  isApproved: true,
  owner: PAYING_OWNER,
};

/**
 * Public group visibility.
 *
 * Groups have no isApproved field, so only the owner check applies.
 * isActive guards against soft-deleted groups.
 */
export const PUBLIC_GROUP_WHERE = {
  isActive: true,
  owner: PAYING_OWNER,
};
