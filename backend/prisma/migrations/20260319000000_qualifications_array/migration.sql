-- Change qualifications from nullable text to text array
ALTER TABLE "team_members" DROP COLUMN "qualifications";
ALTER TABLE "team_members" ADD COLUMN "qualifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
