-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmailType" ADD VALUE 'APPLICATION_SUBMITTED';
ALTER TYPE "EmailType" ADD VALUE 'APPLICATION_ACCEPTED';
ALTER TYPE "EmailType" ADD VALUE 'APPLICATION_REJECTED';
ALTER TYPE "EmailType" ADD VALUE 'APPLICATION_WAITLISTED';
ALTER TYPE "EmailType" ADD VALUE 'APPLICATION_UNDER_REVIEW';
ALTER TYPE "EmailType" ADD VALUE 'APPLICATION_MISSING_INFO';
ALTER TYPE "EmailType" ADD VALUE 'INVITATION_EVENT_ROLE';
ALTER TYPE "EmailType" ADD VALUE 'INVITATION_ADMIN';
ALTER TYPE "EmailType" ADD VALUE 'TEST';

-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "clickedAt" TIMESTAMP(3),
ADD COLUMN     "openedAt" TIMESTAMP(3),
ADD COLUMN     "templateData" JSONB,
ADD COLUMN     "templateName" TEXT,
ADD COLUMN     "templateVersion" TEXT;
