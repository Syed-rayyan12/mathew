-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'REVIEWED', 'SHORTLISTED', 'REJECTED');

-- AlterTable
ALTER TABLE "nurseries" ADD COLUMN     "pricingFeatures" JSONB,
ADD COLUMN     "town" TEXT;

-- AlterTable
ALTER TABLE "team_members" ADD COLUMN     "image" TEXT,
ALTER COLUMN "qualifications" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "plan" DROP NOT NULL,
ALTER COLUMN "plan" SET DEFAULT 'standard';

-- CreateTable
CREATE TABLE "recently_viewed" (
    "id" VARCHAR(15) NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" VARCHAR(15) NOT NULL,
    "nurseryId" VARCHAR(15) NOT NULL,

    CONSTRAINT "recently_viewed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" VARCHAR(30) NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "type" "JobType" NOT NULL DEFAULT 'FULL_TIME',
    "experience" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "responsibilities" TEXT[],
    "requirements" TEXT[],
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "postedById" VARCHAR(15),
    "nurseryName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_applications" (
    "id" VARCHAR(30) NOT NULL,
    "jobId" VARCHAR(30) NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "coverLetter" TEXT,
    "cvUrl" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recently_viewed_userId_nurseryId_key" ON "recently_viewed"("userId", "nurseryId");

-- CreateIndex
CREATE INDEX "jobs_isActive_idx" ON "jobs"("isActive");

-- CreateIndex
CREATE INDEX "jobs_postedById_idx" ON "jobs"("postedById");

-- CreateIndex
CREATE INDEX "job_applications_jobId_idx" ON "job_applications"("jobId");

-- CreateIndex
CREATE INDEX "job_applications_status_idx" ON "job_applications"("status");

-- CreateIndex
CREATE INDEX "nurseries_isApproved_idx" ON "nurseries"("isApproved");

-- CreateIndex
CREATE INDEX "nurseries_groupId_idx" ON "nurseries"("groupId");

-- CreateIndex
CREATE INDEX "nurseries_city_idx" ON "nurseries"("city");

-- CreateIndex
CREATE INDEX "nurseries_town_idx" ON "nurseries"("town");

-- CreateIndex
CREATE INDEX "nurseries_isApproved_groupId_idx" ON "nurseries"("isApproved", "groupId");

-- CreateIndex
CREATE INDEX "reviews_nurseryId_idx" ON "reviews"("nurseryId");

-- CreateIndex
CREATE INDEX "reviews_isApproved_isRejected_idx" ON "reviews"("isApproved", "isRejected");

-- CreateIndex
CREATE INDEX "reviews_nurseryId_isApproved_isRejected_idx" ON "reviews"("nurseryId", "isApproved", "isRejected");

-- AddForeignKey
ALTER TABLE "recently_viewed" ADD CONSTRAINT "recently_viewed_nurseryId_fkey" FOREIGN KEY ("nurseryId") REFERENCES "nurseries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recently_viewed" ADD CONSTRAINT "recently_viewed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
