-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('NURSERY', 'GROUP');

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "isRejected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewType" "ReviewType" NOT NULL DEFAULT 'NURSERY',
ALTER COLUMN "isApproved" SET DEFAULT true;
