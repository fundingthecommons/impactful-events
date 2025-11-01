-- CreateTable
CREATE TABLE "AskOfferLike" (
    "id" TEXT NOT NULL,
    "askOfferId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AskOfferLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AskOfferLike_askOfferId_idx" ON "AskOfferLike"("askOfferId");

-- CreateIndex
CREATE INDEX "AskOfferLike_userId_idx" ON "AskOfferLike"("userId");

-- CreateIndex
CREATE INDEX "AskOfferLike_createdAt_idx" ON "AskOfferLike"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AskOfferLike_askOfferId_userId_key" ON "AskOfferLike"("askOfferId", "userId");

-- AddForeignKey
ALTER TABLE "AskOfferLike" ADD CONSTRAINT "AskOfferLike_askOfferId_fkey" FOREIGN KEY ("askOfferId") REFERENCES "AskOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AskOfferLike" ADD CONSTRAINT "AskOfferLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
