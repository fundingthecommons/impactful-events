-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "speakerPreferredDates" TEXT,
ADD COLUMN     "speakerPreferredTimes" TEXT;

-- CreateTable
CREATE TABLE "SessionComment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionCommentLike" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionCommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionComment_sessionId_idx" ON "SessionComment"("sessionId");

-- CreateIndex
CREATE INDEX "SessionComment_userId_idx" ON "SessionComment"("userId");

-- CreateIndex
CREATE INDEX "SessionComment_parentId_idx" ON "SessionComment"("parentId");

-- CreateIndex
CREATE INDEX "SessionCommentLike_commentId_idx" ON "SessionCommentLike"("commentId");

-- CreateIndex
CREATE INDEX "SessionCommentLike_userId_idx" ON "SessionCommentLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionCommentLike_commentId_userId_key" ON "SessionCommentLike"("commentId", "userId");

-- AddForeignKey
ALTER TABLE "SessionComment" ADD CONSTRAINT "SessionComment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ScheduleSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionComment" ADD CONSTRAINT "SessionComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionComment" ADD CONSTRAINT "SessionComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SessionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCommentLike" ADD CONSTRAINT "SessionCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "SessionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCommentLike" ADD CONSTRAINT "SessionCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
