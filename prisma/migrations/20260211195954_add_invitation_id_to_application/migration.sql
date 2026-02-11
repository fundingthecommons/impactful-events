-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "invitationId" TEXT;

-- CreateTable
CREATE TABLE "SessionSpeaker" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionSpeaker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionSpeaker_sessionId_idx" ON "SessionSpeaker"("sessionId");

-- CreateIndex
CREATE INDEX "SessionSpeaker_userId_idx" ON "SessionSpeaker"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionSpeaker_sessionId_userId_key" ON "SessionSpeaker"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "Application_invitationId_idx" ON "Application"("invitationId");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSpeaker" ADD CONSTRAINT "SessionSpeaker_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ScheduleSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSpeaker" ADD CONSTRAINT "SessionSpeaker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
