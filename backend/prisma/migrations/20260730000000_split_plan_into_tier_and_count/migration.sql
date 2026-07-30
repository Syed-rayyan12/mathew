-- Split User.plan into a feature tier and a paid nursery allowance.
-- No live customers, so `plan` is dropped rather than kept for backfill.

ALTER TABLE "users" ADD COLUMN "planTier" TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE "users" ADD COLUMN "paidNurseryCount" INTEGER NOT NULL DEFAULT 1;

-- Existing platinum accounts keep their tier. Legacy 'free' rows (unpaid
-- signups) fall to the standard default, which is what they had access to.
UPDATE "users" SET "planTier" = 'platinum' WHERE "plan" = 'platinum';

-- Unpaid signups have no allowance until they check out.
UPDATE "users" SET "paidNurseryCount" = 0 WHERE "plan" = 'free';

ALTER TABLE "users" DROP COLUMN "plan";

-- Ledger of Checkout Sessions already applied to an account. The primary key
-- is the Stripe session id, so inserting it is what makes reconciliation
-- idempotent under a webhook/redirect race and refuses a replayed session.
CREATE TABLE "processed_checkout_sessions" (
    "id" VARCHAR(255) NOT NULL,
    "userId" VARCHAR(15) NOT NULL,
    "planTier" TEXT NOT NULL,
    "nurseryCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "processed_checkout_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "processed_checkout_sessions_userId_idx" ON "processed_checkout_sessions"("userId");
