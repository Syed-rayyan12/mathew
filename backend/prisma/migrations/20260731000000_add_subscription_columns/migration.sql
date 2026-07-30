-- Subscription state mirrored from Stripe.
--
-- Every existing owner defaults to 'none'. That is deliberate: nothing on this
-- database has ever had a recurring subscription, because checkout ran in
-- mode:'payment' until now. Backfill before deploying — see Task 14.
ALTER TABLE "users" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "users" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "users" ADD COLUMN "subscriptionStatus" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "users" ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "cancelAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_stripeSubscriptionId_key" ON "users"("stripeSubscriptionId");

-- Public nursery queries filter on the owner's status, so this is on the hot
-- path for every visitor-facing list.
CREATE INDEX "users_subscriptionStatus_idx" ON "users"("subscriptionStatus");
