-- CreateEnum
CREATE TYPE "DietType" AS ENUM ('OMNIVORE', 'VEGETARIAN', 'VEGAN', 'OTHER');

-- CreateEnum
CREATE TYPE "MentoringOpenness" AS ENUM ('YES', 'NO', 'MAYBE');

-- AlterTable
ALTER TABLE "ApplicationOnboarding" ADD COLUMN     "allergiesIntolerances" TEXT,
ADD COLUMN     "arrivalDateTime" TIMESTAMP(3),
ADD COLUMN     "beyondWorkDescription" TEXT,
ADD COLUMN     "beyondWorkDuration" TEXT,
ADD COLUMN     "beyondWorkInterests" TEXT,
ADD COLUMN     "beyondWorkMaterials" TEXT,
ADD COLUMN     "beyondWorkTitle" TEXT,
ADD COLUMN     "bloodType" TEXT,
ADD COLUMN     "codeOfConductAgreement" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "communityActivitiesConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "departureDateTime" TIMESTAMP(3),
ADD COLUMN     "dietType" "DietType",
ADD COLUMN     "dietTypeOther" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "emergencyContactRelationship" TEXT,
ADD COLUMN     "englishProficiencyLevel" INTEGER,
ADD COLUMN     "headshotFileName" TEXT,
ADD COLUMN     "headshotUrl" TEXT,
ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "liabilityWaiverConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mentorsToLearnFrom" TEXT,
ADD COLUMN     "needsVisaLetter" BOOLEAN,
ADD COLUMN     "openToMentoring" "MentoringOpenness",
ADD COLUMN     "organizationsToConnect" TEXT,
ADD COLUMN     "passportNumber" TEXT,
ADD COLUMN     "primaryGoals" TEXT,
ADD COLUMN     "shortBio" TEXT,
ADD COLUMN     "skillsToGain" TEXT,
ADD COLUMN     "technicalWorkshopDescription" TEXT,
ADD COLUMN     "technicalWorkshopDuration" TEXT,
ADD COLUMN     "technicalWorkshopMaterials" TEXT,
ADD COLUMN     "technicalWorkshopTitle" TEXT;
