/*
  Warnings:

  - You are about to drop the column `content` on the `articles` table. All the data in the column will be lost.
  - You are about to drop the column `excerpt` on the `articles` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `articles` table. All the data in the column will be lost.
  - You are about to drop the column `lastSeen` on the `users` table. All the data in the column will be lost.
  - Added the required column `cardHeading` to the `articles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cardParagraph` to the `articles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `articles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sections` to the `articles` table without a default value. This is not possible if the table is not empty.
  - Made the column `publishedAt` on table `articles` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "articles" DROP COLUMN "content",
DROP COLUMN "excerpt",
DROP COLUMN "title",
ADD COLUMN     "cardHeading" TEXT NOT NULL,
ADD COLUMN     "cardParagraph" TEXT NOT NULL,
ADD COLUMN     "finalHeading" TEXT,
ADD COLUMN     "finalParagraph" TEXT,
ADD COLUMN     "listHeading" TEXT,
ADD COLUMN     "listItems" JSONB,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "sections" JSONB NOT NULL,
ADD COLUMN     "tipText" TEXT,
ALTER COLUMN "isPublished" SET DEFAULT true,
ALTER COLUMN "publishedAt" SET NOT NULL,
ALTER COLUMN "publishedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "lastSeen",
ALTER COLUMN "isActive" SET DEFAULT false;
