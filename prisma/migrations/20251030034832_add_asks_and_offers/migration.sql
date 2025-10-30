-- CreateEnum
CREATE TYPE "AskOfferType" AS ENUM ('ASK', 'OFFER');

-- CreateTable
CREATE TABLE "AskOffer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "AskOfferType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AskOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AskOffer_userId_idx" ON "AskOffer"("userId");

-- CreateIndex
CREATE INDEX "AskOffer_eventId_idx" ON "AskOffer"("eventId");

-- CreateIndex
CREATE INDEX "AskOffer_type_idx" ON "AskOffer"("type");

-- CreateIndex
CREATE INDEX "AskOffer_isActive_idx" ON "AskOffer"("isActive");

-- CreateIndex
CREATE INDEX "AskOffer_createdAt_idx" ON "AskOffer"("createdAt");

-- AddForeignKey
ALTER TABLE "AskOffer" ADD CONSTRAINT "AskOffer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AskOffer" ADD CONSTRAINT "AskOffer_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
