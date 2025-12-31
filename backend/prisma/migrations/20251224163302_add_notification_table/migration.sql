-- CreateEnum
CREATE TYPE "NotificationEntity" AS ENUM ('USER', 'NURSERY', 'GROUP', 'REVIEW');

-- CreateTable
CREATE TABLE "notifications" (
    "id" VARCHAR(15) NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entity" "NotificationEntity" NOT NULL,
    "entityId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
