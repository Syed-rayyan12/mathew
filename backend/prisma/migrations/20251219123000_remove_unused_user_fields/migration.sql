/*
  Warnings:

  - You are about to drop the column `rating` on the `nurseries` table. All the data in the column will be lost.
  - You are about to drop the `nursery_groups` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "nurseries" DROP CONSTRAINT "nurseries_groupId_fkey";

-- DropIndex
DROP INDEX "nurseries_ownerId_key";

-- AlterTable
ALTER TABLE "nurseries" DROP COLUMN "rating",
ADD COLUMN     "cardImage" TEXT;

-- DropTable
DROP TABLE "nursery_groups";

-- AddForeignKey
ALTER TABLE "nurseries" ADD CONSTRAINT "nurseries_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "nurseries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
