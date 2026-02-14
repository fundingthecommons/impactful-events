-- AlterTable
ALTER TABLE "ScheduleSession" ADD COLUMN     "trackId" TEXT;

-- AlterTable
ALTER TABLE "SessionSpeaker" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'Speaker';

-- CreateTable
CREATE TABLE "ScheduleTrack" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#8b5cf6',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleTrack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleTrack_eventId_idx" ON "ScheduleTrack"("eventId");

-- CreateIndex
CREATE INDEX "ScheduleTrack_order_idx" ON "ScheduleTrack"("order");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleTrack_eventId_name_key" ON "ScheduleTrack"("eventId", "name");

-- CreateIndex
CREATE INDEX "ScheduleSession_trackId_idx" ON "ScheduleSession"("trackId");

-- AddForeignKey
ALTER TABLE "ScheduleTrack" ADD CONSTRAINT "ScheduleTrack_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleSession" ADD CONSTRAINT "ScheduleSession_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "ScheduleTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
