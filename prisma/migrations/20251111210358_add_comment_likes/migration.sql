-- CreateTable
CREATE TABLE "ProjectUpdateCommentLike" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kudosTransferred" DOUBLE PRECISION,
    "likerKudosAtTime" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectUpdateCommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectUpdateCommentLike_commentId_idx" ON "ProjectUpdateCommentLike"("commentId");

-- CreateIndex
CREATE INDEX "ProjectUpdateCommentLike_userId_idx" ON "ProjectUpdateCommentLike"("userId");

-- CreateIndex
CREATE INDEX "ProjectUpdateCommentLike_createdAt_idx" ON "ProjectUpdateCommentLike"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectUpdateCommentLike_commentId_userId_key" ON "ProjectUpdateCommentLike"("commentId", "userId");

-- AddForeignKey
ALTER TABLE "ProjectUpdateCommentLike" ADD CONSTRAINT "ProjectUpdateCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ProjectUpdateComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUpdateCommentLike" ADD CONSTRAINT "ProjectUpdateCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
