-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CommunicationContentType" ADD VALUE 'FORUM_COMMENT';
ALTER TYPE "CommunicationContentType" ADD VALUE 'ASK_OFFER_COMMENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmailType" ADD VALUE 'UPDATE_COMMENT';
ALTER TYPE "EmailType" ADD VALUE 'FORUM_COMMENT';
ALTER TYPE "EmailType" ADD VALUE 'ASK_OFFER_COMMENT';

-- CreateTable
CREATE TABLE "AskOfferComment" (
    "id" TEXT NOT NULL,
    "askOfferId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AskOfferComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AskOfferCommentLike" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kudosTransferred" DOUBLE PRECISION,
    "likerKudosAtTime" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AskOfferCommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AskOfferComment_askOfferId_idx" ON "AskOfferComment"("askOfferId");

-- CreateIndex
CREATE INDEX "AskOfferComment_userId_idx" ON "AskOfferComment"("userId");

-- CreateIndex
CREATE INDEX "AskOfferComment_parentId_idx" ON "AskOfferComment"("parentId");

-- CreateIndex
CREATE INDEX "AskOfferComment_createdAt_idx" ON "AskOfferComment"("createdAt");

-- CreateIndex
CREATE INDEX "AskOfferCommentLike_commentId_idx" ON "AskOfferCommentLike"("commentId");

-- CreateIndex
CREATE INDEX "AskOfferCommentLike_userId_idx" ON "AskOfferCommentLike"("userId");

-- CreateIndex
CREATE INDEX "AskOfferCommentLike_createdAt_idx" ON "AskOfferCommentLike"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AskOfferCommentLike_commentId_userId_key" ON "AskOfferCommentLike"("commentId", "userId");

-- AddForeignKey
ALTER TABLE "AskOfferComment" ADD CONSTRAINT "AskOfferComment_askOfferId_fkey" FOREIGN KEY ("askOfferId") REFERENCES "AskOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AskOfferComment" ADD CONSTRAINT "AskOfferComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AskOfferComment" ADD CONSTRAINT "AskOfferComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AskOfferComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AskOfferCommentLike" ADD CONSTRAINT "AskOfferCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "AskOfferComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AskOfferCommentLike" ADD CONSTRAINT "AskOfferCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
