-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminLabels" TEXT[],
ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "adminUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "adminUpdatedBy" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_adminUpdatedBy_fkey" FOREIGN KEY ("adminUpdatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
