-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "priorExperience" TEXT,
ADD COLUMN     "skillsSource" TEXT DEFAULT 'manual',
ADD COLUMN     "skillsSyncedAt" TIMESTAMP(3);
