-- Plan minimum term and cancellation notice.
-- Existing rows get NULL term (grandfathered) and noticeStatus 'none'.
ALTER TABLE "users" ADD COLUMN "minimumTermEnd" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "noticeServedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "noticeStatus" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "users" ADD COLUMN "offerCode" TEXT;

CREATE INDEX "users_noticeStatus_idx" ON "users"("noticeStatus");
