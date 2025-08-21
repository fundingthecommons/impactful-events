-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "isComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastIncompleteAt" TIMESTAMP(3);
