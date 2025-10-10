-- CreateEnum
CREATE TYPE "CommunicationType" AS ENUM ('EMAIL', 'TELEGRAM', 'SMS', 'DISCORD', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "CommunicationStatus" AS ENUM ('DRAFT', 'QUEUED', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommunicationContentType" AS ENUM ('APPLICATION_SUBMITTED', 'APPLICATION_ACCEPTED', 'APPLICATION_REJECTED', 'APPLICATION_WAITLISTED', 'APPLICATION_UNDER_REVIEW', 'APPLICATION_MISSING_INFO', 'INVITATION_EVENT_ROLE', 'INVITATION_ADMIN', 'GENERAL', 'BULK_MESSAGE', 'TEST', 'MISSING_INFO', 'STATUS_UPDATE');

-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "eventId" TEXT NOT NULL,
    "toEmail" TEXT,
    "toTelegram" TEXT,
    "toPhone" TEXT,
    "toDiscord" TEXT,
    "channel" "CommunicationType" NOT NULL DEFAULT 'EMAIL',
    "subject" TEXT,
    "htmlContent" TEXT,
    "textContent" TEXT NOT NULL,
    "fromEmail" TEXT DEFAULT 'james@fundingthecommons.io',
    "type" "CommunicationContentType" NOT NULL DEFAULT 'MISSING_INFO',
    "status" "CommunicationStatus" NOT NULL DEFAULT 'DRAFT',
    "missingFields" TEXT[],
    "createdBy" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "postmarkId" TEXT,
    "telegramMsgId" TEXT,
    "templateName" TEXT,
    "templateVersion" TEXT,
    "templateData" JSONB,
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Communication_applicationId_idx" ON "Communication"("applicationId");

-- CreateIndex
CREATE INDEX "Communication_eventId_idx" ON "Communication"("eventId");

-- CreateIndex
CREATE INDEX "Communication_status_idx" ON "Communication"("status");

-- CreateIndex
CREATE INDEX "Communication_toEmail_idx" ON "Communication"("toEmail");

-- CreateIndex
CREATE INDEX "Communication_toTelegram_idx" ON "Communication"("toTelegram");

-- CreateIndex
CREATE INDEX "Communication_channel_idx" ON "Communication"("channel");

-- CreateIndex
CREATE INDEX "Communication_type_idx" ON "Communication"("type");

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
