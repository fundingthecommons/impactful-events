-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "mentorAvailableDates" TEXT[],
ADD COLUMN     "mentorGoals" TEXT,
ADD COLUMN     "mentorHoursPerWeek" TEXT,
ADD COLUMN     "mentorPreferredContact" TEXT,
ADD COLUMN     "mentorSpecializations" TEXT[],
ADD COLUMN     "mentorshipStyle" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "previousMentoringExp" TEXT;
