/*
  Warnings:

  - You are about to drop the `SponsorGeckoCoin` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[sponsorId]` on the table `GeckoCoin` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "SponsorGeckoCoin" DROP CONSTRAINT "SponsorGeckoCoin_geckoId_fkey";

-- DropForeignKey
ALTER TABLE "SponsorGeckoCoin" DROP CONSTRAINT "SponsorGeckoCoin_sponsorId_fkey";

-- AlterTable
ALTER TABLE "GeckoCoin" ADD COLUMN     "sponsorId" TEXT;

-- DropTable
DROP TABLE "SponsorGeckoCoin";

-- CreateIndex
CREATE UNIQUE INDEX "GeckoCoin_sponsorId_key" ON "GeckoCoin"("sponsorId");

-- AddForeignKey
ALTER TABLE "GeckoCoin" ADD CONSTRAINT "GeckoCoin_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
