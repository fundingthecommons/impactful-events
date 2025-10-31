-- CreateTable
CREATE TABLE "ProjectUpdateLike" (
    "id" TEXT NOT NULL,
    "projectUpdateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blueskyUri" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectUpdateLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectUpdateLike_projectUpdateId_idx" ON "ProjectUpdateLike"("projectUpdateId");

-- CreateIndex
CREATE INDEX "ProjectUpdateLike_userId_idx" ON "ProjectUpdateLike"("userId");

-- CreateIndex
CREATE INDEX "ProjectUpdateLike_createdAt_idx" ON "ProjectUpdateLike"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectUpdateLike_projectUpdateId_userId_key" ON "ProjectUpdateLike"("projectUpdateId", "userId");

-- AddForeignKey
ALTER TABLE "ProjectUpdateLike" ADD CONSTRAINT "ProjectUpdateLike_projectUpdateId_fkey" FOREIGN KEY ("projectUpdateId") REFERENCES "ProjectUpdate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUpdateLike" ADD CONSTRAINT "ProjectUpdateLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
