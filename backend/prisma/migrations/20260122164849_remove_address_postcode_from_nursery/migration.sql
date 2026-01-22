/*
  Warnings:

  - You are about to drop the column `address` on the `groups` table. All the data in the column will be lost.
  - You are about to drop the column `postcode` on the `groups` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `nurseries` table. All the data in the column will be lost.
  - You are about to drop the column `postcode` on the `nurseries` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "groups" DROP COLUMN "address",
DROP COLUMN "postcode";

-- AlterTable
ALTER TABLE "nurseries" DROP COLUMN "address",
DROP COLUMN "postcode";
