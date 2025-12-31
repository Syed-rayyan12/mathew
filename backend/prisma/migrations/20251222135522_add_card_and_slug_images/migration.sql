/*
  Warnings:

  - You are about to drop the column `image` on the `articles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "articles" DROP COLUMN "image",
ADD COLUMN     "cardImage" TEXT,
ADD COLUMN     "slugImage" TEXT;
