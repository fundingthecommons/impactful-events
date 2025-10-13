-- CreateEnum
CREATE TYPE "ApplicationType" AS ENUM ('RESIDENT', 'MENTOR');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "applicationType" "ApplicationType" NOT NULL DEFAULT 'RESIDENT';
