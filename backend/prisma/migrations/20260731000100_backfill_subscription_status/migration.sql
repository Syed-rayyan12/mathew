-- Backfill: subscriptionStatus defaults to 'none', which is not live, so
-- without this every pre-subscription owner's nurseries disappear from the
-- public site the moment PUBLIC_NURSERY_WHERE ships.
--
-- Grandfathers exactly the accounts that are already visible: owners with at
-- least one approved nursery. Anything unapproved stays at 'none' and stays
-- invisible, which it already was.
--
-- These accounts have no Stripe subscription behind them. They are marked
-- 'active' as a deliberate manual grant, not as a mirror of Stripe, and no
-- webhook will ever move them because stripeSubscriptionId is null.
UPDATE "users" u
SET "subscriptionStatus" = 'active'
WHERE u.role = 'NURSERY_OWNER'
  AND u."subscriptionStatus" = 'none'
  AND EXISTS (
    SELECT 1 FROM "nurseries" n
    WHERE n."ownerId" = u.id AND n."isApproved" = true
  );
