-- CreateTable
CREATE TABLE "TelegramAuth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedSession" TEXT NOT NULL,
    "encryptedApiHash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramAuth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramAuth_userId_key" ON "TelegramAuth"("userId");

-- CreateIndex
CREATE INDEX "TelegramAuth_userId_idx" ON "TelegramAuth"("userId");

-- CreateIndex
CREATE INDEX "TelegramAuth_expiresAt_idx" ON "TelegramAuth"("expiresAt");

-- CreateIndex
CREATE INDEX "TelegramAuth_isActive_idx" ON "TelegramAuth"("isActive");

-- AddForeignKey
ALTER TABLE "TelegramAuth" ADD CONSTRAINT "TelegramAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
