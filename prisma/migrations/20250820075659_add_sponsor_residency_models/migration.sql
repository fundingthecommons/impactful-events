-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('KICKOFF', 'MENTORSHIP', 'DEMO_DAY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('PENDING', 'APPROVED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliverableCategory" AS ENUM ('TECHNICAL', 'SUPPORT', 'PATHWAYS', 'VISIBILITY');

-- CreateEnum
CREATE TYPE "DeliverableStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SponsorVisitRequest" (
    "id" TEXT NOT NULL,
    "eventSponsorId" TEXT NOT NULL,
    "visitType" "VisitType" NOT NULL,
    "preferredDates" TIMESTAMP(3)[],
    "numAttendees" INTEGER NOT NULL DEFAULT 1,
    "purpose" TEXT NOT NULL,
    "requirements" TEXT,
    "status" "VisitStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorVisitRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorDeliverable" (
    "id" TEXT NOT NULL,
    "eventSponsorId" TEXT NOT NULL,
    "category" "DeliverableCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DeliverableStatus" NOT NULL DEFAULT 'PLANNED',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "estimatedHours" INTEGER,
    "actualHours" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SponsorVisitRequest_eventSponsorId_idx" ON "SponsorVisitRequest"("eventSponsorId");

-- CreateIndex
CREATE INDEX "SponsorVisitRequest_status_idx" ON "SponsorVisitRequest"("status");

-- CreateIndex
CREATE INDEX "SponsorVisitRequest_visitType_idx" ON "SponsorVisitRequest"("visitType");

-- CreateIndex
CREATE INDEX "SponsorDeliverable_eventSponsorId_idx" ON "SponsorDeliverable"("eventSponsorId");

-- CreateIndex
CREATE INDEX "SponsorDeliverable_category_idx" ON "SponsorDeliverable"("category");

-- CreateIndex
CREATE INDEX "SponsorDeliverable_status_idx" ON "SponsorDeliverable"("status");

-- AddForeignKey
ALTER TABLE "SponsorVisitRequest" ADD CONSTRAINT "SponsorVisitRequest_eventSponsorId_fkey" FOREIGN KEY ("eventSponsorId") REFERENCES "EventSponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorDeliverable" ADD CONSTRAINT "SponsorDeliverable_eventSponsorId_fkey" FOREIGN KEY ("eventSponsorId") REFERENCES "EventSponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
