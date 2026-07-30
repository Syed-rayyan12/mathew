-- AlterTable
ALTER TABLE "users" ADD COLUMN "jobsAddonSubscriptionId" TEXT,
ADD COLUMN "jobsAddonStatus" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN "jobsAddonCurrentPeriodEnd" TIMESTAMP(3),
ADD COLUMN "jobsAddonCancelAt" TIMESTAMP(3),
ADD COLUMN "jobsAddonMinimumTermEnd" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_jobsAddonSubscriptionId_key" ON "users"("jobsAddonSubscriptionId");

-- CreateIndex
CREATE INDEX "users_jobsAddonStatus_idx" ON "users"("jobsAddonStatus");
