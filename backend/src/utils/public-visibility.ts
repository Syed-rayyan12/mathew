/**
 * Who the public can see.
 *
 * A survey of the backend found six public nursery queries, none sharing a
 * filter. This is the one place that answers the question, so hiding a lapsed
 * account's listings is a single edit rather than six that have to agree.
 *
 * Nursery.ownerId is non-nullable, so every nursery joins to a user and the
 * relation filter can never silently match nothing.
 */

import { LIVE_SUBSCRIPTION_STATUSES } from './entitlements';

export const PUBLIC_NURSERY_WHERE = {
  isApproved: true,
  owner: {
    OR: [
      // Admin-created nurseries have no subscription and never should. This
      // mirrors the ADMIN pass-through already in requireFeature.
      { role: 'ADMIN' as const },
      { subscriptionStatus: { in: [...LIVE_SUBSCRIPTION_STATUSES] } },
    ],
  },
};
