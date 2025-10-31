-- CreateTable
CREATE TABLE "Praise" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderTelegramId" BIGINT,
    "recipientId" TEXT,
    "recipientName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT,
    "eventId" TEXT,
    "telegramMsgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Praise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Praise_senderId_idx" ON "Praise"("senderId");

-- CreateIndex
CREATE INDEX "Praise_recipientId_idx" ON "Praise"("recipientId");

-- CreateIndex
CREATE INDEX "Praise_eventId_idx" ON "Praise"("eventId");

-- CreateIndex
CREATE INDEX "Praise_createdAt_idx" ON "Praise"("createdAt");

-- AddForeignKey
ALTER TABLE "Praise" ADD CONSTRAINT "Praise_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Praise" ADD CONSTRAINT "Praise_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Praise" ADD CONSTRAINT "Praise_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
