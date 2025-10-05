-- CreateTable
CREATE TABLE "TelegramAuthSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phoneCodeHash" TEXT,
    "apiId" TEXT,
    "apiHash" TEXT,
    "clientData" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramAuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramAuthSession_sessionId_key" ON "TelegramAuthSession"("sessionId");

-- CreateIndex
CREATE INDEX "TelegramAuthSession_sessionId_idx" ON "TelegramAuthSession"("sessionId");

-- CreateIndex
CREATE INDEX "TelegramAuthSession_userId_idx" ON "TelegramAuthSession"("userId");

-- CreateIndex
CREATE INDEX "TelegramAuthSession_expiresAt_idx" ON "TelegramAuthSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "TelegramAuthSession" ADD CONSTRAINT "TelegramAuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
