/*
  Warnings:

  - You are about to drop the column `rating` on the `reviews` table. All the data in the column will be lost.
  - Added the required column `email` to the `reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `overallRating` to the `reviews` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "reviews" DROP COLUMN "rating",
ADD COLUMN     "activities" INTEGER,
ADD COLUMN     "care" INTEGER,
ADD COLUMN     "cleanliness" INTEGER,
ADD COLUMN     "connection" TEXT,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "facilities" INTEGER,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "food" INTEGER,
ADD COLUMN     "initialsOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "learning" INTEGER,
ADD COLUMN     "management" INTEGER,
ADD COLUMN     "overallRating" INTEGER NOT NULL,
ADD COLUMN     "resources" INTEGER,
ADD COLUMN     "safeguarding" INTEGER,
ADD COLUMN     "staff" INTEGER,
ADD COLUMN     "telephone" TEXT,
ADD COLUMN     "value" INTEGER,
ADD COLUMN     "visitDate" TIMESTAMP(3),
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;
