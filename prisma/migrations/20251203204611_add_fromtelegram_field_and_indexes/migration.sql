-- AlterTable
ALTER TABLE "Communication" ADD COLUMN     "fromTelegram" TEXT;

-- CreateIndex
CREATE INDEX "Communication_fromEmail_idx" ON "Communication"("fromEmail");

-- CreateIndex
CREATE INDEX "Communication_fromTelegram_idx" ON "Communication"("fromTelegram");
