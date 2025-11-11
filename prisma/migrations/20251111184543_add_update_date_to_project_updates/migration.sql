-- AlterTable
ALTER TABLE "ProjectUpdate" ADD COLUMN     "updateDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "ProjectUpdate_updateDate_idx" ON "ProjectUpdate"("updateDate");
