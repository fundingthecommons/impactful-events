/*
  Warnings:

  - Added the required column `encryptedApiId` to the `TelegramAuth` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TelegramAuth" ADD COLUMN     "encryptedApiId" TEXT NOT NULL;
