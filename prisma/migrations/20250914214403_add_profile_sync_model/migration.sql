-- CreateTable
CREATE TABLE "ProfileSync" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "syncedFields" TEXT[],
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileSync_userId_idx" ON "ProfileSync"("userId");

-- CreateIndex
CREATE INDEX "ProfileSync_applicationId_idx" ON "ProfileSync"("applicationId");

-- CreateIndex
CREATE INDEX "ProfileSync_syncedAt_idx" ON "ProfileSync"("syncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileSync_userId_applicationId_key" ON "ProfileSync"("userId", "applicationId");

-- AddForeignKey
ALTER TABLE "ProfileSync" ADD CONSTRAINT "ProfileSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileSync" ADD CONSTRAINT "ProfileSync_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
