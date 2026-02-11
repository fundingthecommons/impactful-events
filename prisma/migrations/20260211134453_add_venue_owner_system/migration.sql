-- AlterEnum
ALTER TYPE "InvitationType" ADD VALUE 'VENUE_OWNER';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "featureScheduleManagement" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "venueId" TEXT;

-- CreateTable
CREATE TABLE "VenueOwner" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "assignedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueOwner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VenueOwner_userId_eventId_idx" ON "VenueOwner"("userId", "eventId");

-- CreateIndex
CREATE INDEX "VenueOwner_venueId_idx" ON "VenueOwner"("venueId");

-- CreateIndex
CREATE INDEX "VenueOwner_eventId_idx" ON "VenueOwner"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "VenueOwner_userId_venueId_key" ON "VenueOwner"("userId", "venueId");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "ScheduleVenue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueOwner" ADD CONSTRAINT "VenueOwner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueOwner" ADD CONSTRAINT "VenueOwner_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "ScheduleVenue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueOwner" ADD CONSTRAINT "VenueOwner_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
