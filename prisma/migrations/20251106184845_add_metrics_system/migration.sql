-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('BUILDER', 'ENVIRONMENTAL', 'GIT', 'ONCHAIN', 'OFFCHAIN', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CollectionMethod" AS ENUM ('ONCHAIN', 'OFFCHAIN_API', 'SELF_REPORTING', 'MANUAL', 'AUTOMATED');

-- CreateEnum
CREATE TYPE "MetricCadence" AS ENUM ('REALTIME', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MetricTimePeriod" AS ENUM ('BEFORE', 'DURING', 'AFTER', 'ONGOING');

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "metricType" "MetricType"[],
    "unitOfMetric" TEXT,
    "category" TEXT,
    "collectionMethod" "CollectionMethod" NOT NULL,
    "cadence" "MetricCadence" NOT NULL DEFAULT 'ONE_TIME',
    "timePeriod" "MetricTimePeriod" NOT NULL DEFAULT 'DURING',
    "isOnChain" BOOLEAN NOT NULL DEFAULT false,
    "deployerAccount" TEXT,
    "offChainApis" TEXT[],
    "gitMetric" BOOLEAN NOT NULL DEFAULT false,
    "dependencyTracking" BOOLEAN NOT NULL DEFAULT false,
    "attestationOriented" BOOLEAN NOT NULL DEFAULT false,
    "customEvaluation" BOOLEAN NOT NULL DEFAULT false,
    "selfReporting" BOOLEAN NOT NULL DEFAULT false,
    "hypercertsUsed" BOOLEAN NOT NULL DEFAULT false,
    "zkEmail" BOOLEAN NOT NULL DEFAULT false,
    "allSoftwareProjects" BOOLEAN NOT NULL DEFAULT false,
    "ftcProjects" TEXT[],
    "projectIdNeeded" BOOLEAN NOT NULL DEFAULT false,
    "environmentalSocialGood" BOOLEAN NOT NULL DEFAULT false,
    "relevantToBBI" BOOLEAN NOT NULL DEFAULT false,
    "impactEvaluators" TEXT[],
    "pocContact" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "quantity" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricMeasurement" (
    "id" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "projectId" TEXT,
    "eventId" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "unitOfMetric" TEXT NOT NULL,
    "source" TEXT,
    "verificationUrl" TEXT,
    "measurementDate" TIMESTAMP(3) NOT NULL,
    "timePeriod" "MetricTimePeriod" NOT NULL,
    "notes" TEXT,
    "measuredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMetric" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "isTracking" BOOLEAN NOT NULL DEFAULT true,
    "targetValue" DOUBLE PRECISION,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" TEXT,

    CONSTRAINT "ProjectMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Metric_slug_key" ON "Metric"("slug");

-- CreateIndex
CREATE INDEX "Metric_slug_idx" ON "Metric"("slug");

-- CreateIndex
CREATE INDEX "Metric_collectionMethod_idx" ON "Metric"("collectionMethod");

-- CreateIndex
CREATE INDEX "Metric_cadence_idx" ON "Metric"("cadence");

-- CreateIndex
CREATE INDEX "Metric_isOnChain_idx" ON "Metric"("isOnChain");

-- CreateIndex
CREATE INDEX "Metric_isActive_idx" ON "Metric"("isActive");

-- CreateIndex
CREATE INDEX "Metric_createdAt_idx" ON "Metric"("createdAt");

-- CreateIndex
CREATE INDEX "MetricMeasurement_metricId_idx" ON "MetricMeasurement"("metricId");

-- CreateIndex
CREATE INDEX "MetricMeasurement_projectId_idx" ON "MetricMeasurement"("projectId");

-- CreateIndex
CREATE INDEX "MetricMeasurement_eventId_idx" ON "MetricMeasurement"("eventId");

-- CreateIndex
CREATE INDEX "MetricMeasurement_measurementDate_idx" ON "MetricMeasurement"("measurementDate");

-- CreateIndex
CREATE INDEX "MetricMeasurement_timePeriod_idx" ON "MetricMeasurement"("timePeriod");

-- CreateIndex
CREATE INDEX "ProjectMetric_projectId_idx" ON "ProjectMetric"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMetric_metricId_idx" ON "ProjectMetric"("metricId");

-- CreateIndex
CREATE INDEX "ProjectMetric_isTracking_idx" ON "ProjectMetric"("isTracking");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMetric_projectId_metricId_key" ON "ProjectMetric"("projectId", "metricId");

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricMeasurement" ADD CONSTRAINT "MetricMeasurement_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "Metric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricMeasurement" ADD CONSTRAINT "MetricMeasurement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricMeasurement" ADD CONSTRAINT "MetricMeasurement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricMeasurement" ADD CONSTRAINT "MetricMeasurement_measuredBy_fkey" FOREIGN KEY ("measuredBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMetric" ADD CONSTRAINT "ProjectMetric_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMetric" ADD CONSTRAINT "ProjectMetric_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "Metric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMetric" ADD CONSTRAINT "ProjectMetric_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
