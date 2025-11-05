-- CreateTable
CREATE TABLE "ProjectUpdateComment" (
    "id" TEXT NOT NULL,
    "projectUpdateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectUpdateComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectUpdateComment_projectUpdateId_idx" ON "ProjectUpdateComment"("projectUpdateId");

-- CreateIndex
CREATE INDEX "ProjectUpdateComment_userId_idx" ON "ProjectUpdateComment"("userId");

-- CreateIndex
CREATE INDEX "ProjectUpdateComment_createdAt_idx" ON "ProjectUpdateComment"("createdAt");

-- AddForeignKey
ALTER TABLE "ProjectUpdateComment" ADD CONSTRAINT "ProjectUpdateComment_projectUpdateId_fkey" FOREIGN KEY ("projectUpdateId") REFERENCES "ProjectUpdate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUpdateComment" ADD CONSTRAINT "ProjectUpdateComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
