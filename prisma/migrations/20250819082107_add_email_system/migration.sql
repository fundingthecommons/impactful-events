-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('DRAFT', 'QUEUED', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('MISSING_INFO', 'STATUS_UPDATE', 'GENERAL');

-- CreateTable
CREATE TABLE "Email" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "eventId" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL DEFAULT 'james@fundingthecommons.io',
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT,
    "type" "EmailType" NOT NULL DEFAULT 'MISSING_INFO',
    "status" "EmailStatus" NOT NULL DEFAULT 'DRAFT',
    "missingFields" TEXT[],
    "createdBy" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "postmarkId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Email_applicationId_idx" ON "Email"("applicationId");

-- CreateIndex
CREATE INDEX "Email_eventId_idx" ON "Email"("eventId");

-- CreateIndex
CREATE INDEX "Email_status_idx" ON "Email"("status");

-- CreateIndex
CREATE INDEX "Email_toEmail_idx" ON "Email"("toEmail");

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
