-- CreateTable
CREATE TABLE "ScheduleVenue" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capacity" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleVenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleSessionType" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#4299e1',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleSessionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleSession" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "speakers" TEXT[],
    "venueId" TEXT,
    "sessionTypeId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleVenue_eventId_idx" ON "ScheduleVenue"("eventId");

-- CreateIndex
CREATE INDEX "ScheduleVenue_order_idx" ON "ScheduleVenue"("order");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleVenue_eventId_name_key" ON "ScheduleVenue"("eventId", "name");

-- CreateIndex
CREATE INDEX "ScheduleSessionType_eventId_idx" ON "ScheduleSessionType"("eventId");

-- CreateIndex
CREATE INDEX "ScheduleSessionType_order_idx" ON "ScheduleSessionType"("order");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleSessionType_eventId_name_key" ON "ScheduleSessionType"("eventId", "name");

-- CreateIndex
CREATE INDEX "ScheduleSession_eventId_idx" ON "ScheduleSession"("eventId");

-- CreateIndex
CREATE INDEX "ScheduleSession_startTime_idx" ON "ScheduleSession"("startTime");

-- CreateIndex
CREATE INDEX "ScheduleSession_venueId_idx" ON "ScheduleSession"("venueId");

-- CreateIndex
CREATE INDEX "ScheduleSession_sessionTypeId_idx" ON "ScheduleSession"("sessionTypeId");

-- CreateIndex
CREATE INDEX "ScheduleSession_isPublished_idx" ON "ScheduleSession"("isPublished");

-- AddForeignKey
ALTER TABLE "ScheduleVenue" ADD CONSTRAINT "ScheduleVenue_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleSessionType" ADD CONSTRAINT "ScheduleSessionType_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleSession" ADD CONSTRAINT "ScheduleSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleSession" ADD CONSTRAINT "ScheduleSession_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "ScheduleVenue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleSession" ADD CONSTRAINT "ScheduleSession_sessionTypeId_fkey" FOREIGN KEY ("sessionTypeId") REFERENCES "ScheduleSessionType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
