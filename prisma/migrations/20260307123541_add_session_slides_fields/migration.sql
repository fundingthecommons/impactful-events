-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "activityCertCid" TEXT,
ADD COLUMN     "activityCertPublishedAt" TIMESTAMP(3),
ADD COLUMN     "activityCertUri" TEXT,
ADD COLUMN     "hyperboardCid" TEXT,
ADD COLUMN     "hyperboardUri" TEXT;

-- AlterTable
ALTER TABLE "ScheduleSession" ADD COLUMN     "slidesFileName" TEXT,
ADD COLUMN     "slidesUploadedAt" TIMESTAMP(3),
ADD COLUMN     "slidesUploadedById" TEXT,
ADD COLUMN     "slidesUrl" TEXT;

-- AddForeignKey
ALTER TABLE "ScheduleSession" ADD CONSTRAINT "ScheduleSession_slidesUploadedById_fkey" FOREIGN KEY ("slidesUploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
