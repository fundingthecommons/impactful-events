-- AlterTable
ALTER TABLE "ScheduleSession" ADD COLUMN     "roomId" TEXT;

-- CreateTable
CREATE TABLE "ScheduleRoom" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleRoom_venueId_idx" ON "ScheduleRoom"("venueId");

-- CreateIndex
CREATE INDEX "ScheduleRoom_order_idx" ON "ScheduleRoom"("order");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleRoom_venueId_name_key" ON "ScheduleRoom"("venueId", "name");

-- CreateIndex
CREATE INDEX "ScheduleSession_roomId_idx" ON "ScheduleSession"("roomId");

-- AddForeignKey
ALTER TABLE "ScheduleRoom" ADD CONSTRAINT "ScheduleRoom_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "ScheduleVenue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleSession" ADD CONSTRAINT "ScheduleSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ScheduleRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
