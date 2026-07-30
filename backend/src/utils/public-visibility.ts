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
 *
 * Job.postedById is nullable (onDelete: SetNull). A null poster means the advert
 * was either posted by the platform or the posting account was deleted. Both
 * cases must stay visible because there is no owner to bill. Where a poster
 * exists, they must have a live subscription AND be on the platinum tier —
 * job posting is a Platinum-only feature, so a downgraded owner must not keep
 * adverts running.
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

/**
 * Public job visibility.
 *
 * PAYING_OWNER alone is not enough here because job posting is a Platinum
 * feature. An owner who downgrades to Standard keeps a live subscription but
 * loses the right to run adverts, so the poster arm also requires planTier
 * 'platinum'. The status list is reused from the same source of truth so the
 * two checks cannot drift apart.
 *
 * The null arm (postedById is null) covers platform-posted adverts and adverts
 * whose posting account was deleted. Prisma requires { postedBy: { is: null } }
 * rather than { postedById: null } when filtering on a nullable relation, so
 * both arms of the OR use the relation name for consistency.
 */
export const PUBLIC_JOB_WHERE = {
  isActive: true,
  OR: [
    { postedBy: { is: null } },
    {
      postedBy: {
        is: {
          OR: [
            { role: 'ADMIN' as const },
            {
              subscriptionStatus: { in: [...LIVE_SUBSCRIPTION_STATUSES] },
              planTier: 'platinum',
            },
          ],
        },
      },
    },
  ],
};
