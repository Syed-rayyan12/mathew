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
