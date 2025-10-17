-- DropIndex
DROP INDEX "Contact_email_key";

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "about" TEXT,
ADD COLUMN     "lastInteractionAt" TIMESTAMP(3),
ADD COLUMN     "lastInteractionBy" TEXT,
ADD COLUMN     "lastInteractionType" TEXT,
ADD COLUMN     "skills" TEXT[],
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ContactInteraction" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "subject" TEXT,
    "notes" TEXT,
    "communicationId" TEXT,
    "telegramMsgId" TEXT,
    "emailId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interactedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactInteraction_contactId_idx" ON "ContactInteraction"("contactId");

-- CreateIndex
CREATE INDEX "ContactInteraction_userId_idx" ON "ContactInteraction"("userId");

-- CreateIndex
CREATE INDEX "ContactInteraction_interactedAt_idx" ON "ContactInteraction"("interactedAt");

-- CreateIndex
CREATE INDEX "ContactInteraction_type_idx" ON "ContactInteraction"("type");

-- AddForeignKey
ALTER TABLE "ContactInteraction" ADD CONSTRAINT "ContactInteraction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactInteraction" ADD CONSTRAINT "ContactInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactInteraction" ADD CONSTRAINT "ContactInteraction_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "Communication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
