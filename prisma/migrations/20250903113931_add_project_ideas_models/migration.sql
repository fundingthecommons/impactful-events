-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "ProjectIdea" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "githubPath" TEXT NOT NULL,
    "technologies" TEXT[],
    "difficulty" TEXT,
    "category" TEXT,
    "githubSha" TEXT,
    "lastSynced" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSync" (
    "id" TEXT NOT NULL,
    "totalProjects" INTEGER NOT NULL,
    "syncedCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "lastCommitSha" TEXT,

    CONSTRAINT "ProjectSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectIdea_slug_key" ON "ProjectIdea"("slug");

-- CreateIndex
CREATE INDEX "ProjectIdea_slug_idx" ON "ProjectIdea"("slug");

-- CreateIndex
CREATE INDEX "ProjectIdea_syncStatus_idx" ON "ProjectIdea"("syncStatus");

-- CreateIndex
CREATE INDEX "ProjectIdea_lastSynced_idx" ON "ProjectIdea"("lastSynced");

-- CreateIndex
CREATE INDEX "ProjectIdea_category_idx" ON "ProjectIdea"("category");

-- CreateIndex
CREATE INDEX "ProjectIdea_difficulty_idx" ON "ProjectIdea"("difficulty");

-- CreateIndex
CREATE INDEX "ProjectSync_status_idx" ON "ProjectSync"("status");

-- CreateIndex
CREATE INDEX "ProjectSync_startedAt_idx" ON "ProjectSync"("startedAt");
