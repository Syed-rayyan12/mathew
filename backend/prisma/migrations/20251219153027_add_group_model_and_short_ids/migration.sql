/*
  Warnings:

  - The primary key for the `articles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `articles` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(15)`.
  - The primary key for the `contact_submissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `contact_submissions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(15)`.
  - The primary key for the `nurseries` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `nurseries` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(15)`.
  - You are about to alter the column `ownerId` on the `nurseries` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(15)`.
  - You are about to alter the column `groupId` on the `nurseries` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(15)`.
  - The primary key for the `reviews` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `reviews` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(15)`.
  - You are about to alter the column `userId` on the `reviews` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(15)`.
  - You are about to alter the column `nurseryId` on the `reviews` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(15)`.
  - The primary key for the `shortlists` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `shortlists` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(15)`.
  - You are about to alter the column `userId` on the `shortlists` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(15)`.
  - You are about to alter the column `nurseryId` on the `shortlists` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(15)`.
  - The primary key for the `subscriptions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `subscriptions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(15)`.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(15)`.

*/
-- DropForeignKey
ALTER TABLE "nurseries" DROP CONSTRAINT "nurseries_groupId_fkey";

-- DropForeignKey
ALTER TABLE "nurseries" DROP CONSTRAINT "nurseries_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_nurseryId_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_userId_fkey";

-- DropForeignKey
ALTER TABLE "shortlists" DROP CONSTRAINT "shortlists_nurseryId_fkey";

-- DropForeignKey
ALTER TABLE "shortlists" DROP CONSTRAINT "shortlists_userId_fkey";

-- AlterTable
ALTER TABLE "articles" DROP CONSTRAINT "articles_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(15),
ADD CONSTRAINT "articles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "contact_submissions" DROP CONSTRAINT "contact_submissions_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(15),
ADD CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "nurseries" DROP CONSTRAINT "nurseries_pkey",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(15),
ALTER COLUMN "ownerId" SET DATA TYPE VARCHAR(15),
ALTER COLUMN "groupId" SET DATA TYPE VARCHAR(15),
ADD CONSTRAINT "nurseries_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(15),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(15),
ALTER COLUMN "nurseryId" SET DATA TYPE VARCHAR(15),
ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "shortlists" DROP CONSTRAINT "shortlists_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(15),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(15),
ALTER COLUMN "nurseryId" SET DATA TYPE VARCHAR(15),
ADD CONSTRAINT "shortlists_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(15),
ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSeen" TIMESTAMP(3),
ALTER COLUMN "id" SET DATA TYPE VARCHAR(15),
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "groups" (
    "id" VARCHAR(15) NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "aboutUs" TEXT,
    "description" TEXT,
    "logo" TEXT,
    "cardImage" TEXT,
    "images" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" VARCHAR(15) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "groups_slug_key" ON "groups"("slug");

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nurseries" ADD CONSTRAINT "nurseries_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nurseries" ADD CONSTRAINT "nurseries_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_nurseryId_fkey" FOREIGN KEY ("nurseryId") REFERENCES "nurseries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlists" ADD CONSTRAINT "shortlists_nurseryId_fkey" FOREIGN KEY ("nurseryId") REFERENCES "nurseries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlists" ADD CONSTRAINT "shortlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
