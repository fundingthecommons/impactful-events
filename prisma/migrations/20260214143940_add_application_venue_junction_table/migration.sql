-- CreateTable
CREATE TABLE "ApplicationVenue" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationVenue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationVenue_applicationId_idx" ON "ApplicationVenue"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationVenue_venueId_idx" ON "ApplicationVenue"("venueId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationVenue_applicationId_venueId_key" ON "ApplicationVenue"("applicationId", "venueId");

-- AddForeignKey
ALTER TABLE "ApplicationVenue" ADD CONSTRAINT "ApplicationVenue_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationVenue" ADD CONSTRAINT "ApplicationVenue_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "ScheduleVenue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
