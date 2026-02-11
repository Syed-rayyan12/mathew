-- DropForeignKey
ALTER TABLE "groups" DROP CONSTRAINT "groups_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "nurseries" DROP CONSTRAINT "nurseries_ownerId_fkey";

-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "town" TEXT;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nurseries" ADD CONSTRAINT "nurseries_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
