-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_sponsorId_fkey";

-- AlterTable
ALTER TABLE "Contact" ALTER COLUMN "sponsorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
