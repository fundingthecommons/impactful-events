/*
  Warnings:

  - A unique constraint covering the columns `[email,type,globalRole]` on the table `Invitation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "InvitationType" AS ENUM ('EVENT_ROLE', 'GLOBAL_ADMIN', 'GLOBAL_STAFF');

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "globalRole" TEXT,
ADD COLUMN     "type" "InvitationType" NOT NULL DEFAULT 'EVENT_ROLE',
ALTER COLUMN "eventId" DROP NOT NULL,
ALTER COLUMN "roleId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Invitation_type_idx" ON "Invitation"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_email_type_globalRole_key" ON "Invitation"("email", "type", "globalRole");
