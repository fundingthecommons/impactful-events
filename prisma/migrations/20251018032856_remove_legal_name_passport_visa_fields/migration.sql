/*
  Warnings:

  - You are about to drop the column `legalName` on the `ApplicationOnboarding` table. All the data in the column will be lost.
  - You are about to drop the column `needsVisaLetter` on the `ApplicationOnboarding` table. All the data in the column will be lost.
  - You are about to drop the column `passportNumber` on the `ApplicationOnboarding` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ApplicationOnboarding" DROP COLUMN "legalName",
DROP COLUMN "needsVisaLetter",
DROP COLUMN "passportNumber";
