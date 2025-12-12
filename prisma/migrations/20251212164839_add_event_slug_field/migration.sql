/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_slug_idx" ON "Event"("slug");
