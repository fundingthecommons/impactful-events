-- CreateEnum
CREATE TYPE "AnalyticsEndpoint" AS ENUM ('APPLICATION_TEXT_CORPUS', 'DEMOGRAPHICS_BREAKDOWN', 'SKILLS_WORD_CLOUD', 'APPLICATION_TIMELINE', 'REVIEW_METRICS');

-- CreateTable
CREATE TABLE "AnalyticsAudit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" "AnalyticsEndpoint" NOT NULL,
    "eventId" TEXT,
    "dataRequested" TEXT,
    "requestParams" JSONB,
    "responseSize" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsRateLimit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" "AnalyticsEndpoint" NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRequest" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AnalyticsRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsAudit_userId_idx" ON "AnalyticsAudit"("userId");

-- CreateIndex
CREATE INDEX "AnalyticsAudit_endpoint_idx" ON "AnalyticsAudit"("endpoint");

-- CreateIndex
CREATE INDEX "AnalyticsAudit_eventId_idx" ON "AnalyticsAudit"("eventId");

-- CreateIndex
CREATE INDEX "AnalyticsAudit_createdAt_idx" ON "AnalyticsAudit"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsRateLimit_userId_idx" ON "AnalyticsRateLimit"("userId");

-- CreateIndex
CREATE INDEX "AnalyticsRateLimit_endpoint_idx" ON "AnalyticsRateLimit"("endpoint");

-- CreateIndex
CREATE INDEX "AnalyticsRateLimit_windowStart_idx" ON "AnalyticsRateLimit"("windowStart");

-- CreateIndex
CREATE INDEX "AnalyticsRateLimit_isBlocked_idx" ON "AnalyticsRateLimit"("isBlocked");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsRateLimit_userId_endpoint_key" ON "AnalyticsRateLimit"("userId", "endpoint");

-- AddForeignKey
ALTER TABLE "AnalyticsAudit" ADD CONSTRAINT "AnalyticsAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsRateLimit" ADD CONSTRAINT "AnalyticsRateLimit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
