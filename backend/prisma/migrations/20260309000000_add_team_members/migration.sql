-- CreateTable
CREATE TABLE "team_members" (
    "id" VARCHAR(10) NOT NULL,
    "name" TEXT NOT NULL,
    "experience" TEXT,
    "qualifications" TEXT,
    "crbChecked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nurseryId" VARCHAR(15) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_nurseryId_fkey" FOREIGN KEY ("nurseryId") REFERENCES "nurseries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
