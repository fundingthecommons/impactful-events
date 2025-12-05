-- AlterTable
ALTER TABLE "Repository" ADD COLUMN     "commitsData" JSONB,
ADD COLUMN     "firstCommitDate" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastCommitDate" TIMESTAMP(3),
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "totalCommits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "weeksActive" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "RepositoryResidencyMetrics" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "commitsData" JSONB,
    "residencyCommits" INTEGER NOT NULL DEFAULT 0,
    "residencyStartDate" TIMESTAMP(3),
    "residencyEndDate" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepositoryResidencyMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RepositoryResidencyMetrics_repositoryId_idx" ON "RepositoryResidencyMetrics"("repositoryId");

-- CreateIndex
CREATE INDEX "RepositoryResidencyMetrics_eventId_idx" ON "RepositoryResidencyMetrics"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "RepositoryResidencyMetrics_repositoryId_eventId_key" ON "RepositoryResidencyMetrics"("repositoryId", "eventId");

-- CreateIndex
CREATE INDEX "Repository_isActive_idx" ON "Repository"("isActive");

-- AddForeignKey
ALTER TABLE "RepositoryResidencyMetrics" ADD CONSTRAINT "RepositoryResidencyMetrics_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryResidencyMetrics" ADD CONSTRAINT "RepositoryResidencyMetrics_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
