-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "speakerInvitedByOther" TEXT,
ADD COLUMN     "speakerInvitedByUserId" TEXT;

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "speakerEntityName" TEXT;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_speakerInvitedByUserId_fkey" FOREIGN KEY ("speakerInvitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
