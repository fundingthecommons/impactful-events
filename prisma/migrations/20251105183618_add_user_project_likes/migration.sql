-- CreateTable
CREATE TABLE "UserProjectLike" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserProjectLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserProjectLike_projectId_idx" ON "UserProjectLike"("projectId");

-- CreateIndex
CREATE INDEX "UserProjectLike_userId_idx" ON "UserProjectLike"("userId");

-- CreateIndex
CREATE INDEX "UserProjectLike_createdAt_idx" ON "UserProjectLike"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProjectLike_projectId_userId_key" ON "UserProjectLike"("projectId", "userId");

-- AddForeignKey
ALTER TABLE "UserProjectLike" ADD CONSTRAINT "UserProjectLike_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProjectLike" ADD CONSTRAINT "UserProjectLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
