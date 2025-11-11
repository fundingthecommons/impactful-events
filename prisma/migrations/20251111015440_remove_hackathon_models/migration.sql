/*
  Warnings:

  - You are about to drop the `Announcement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Hackathon` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Judge` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JudgingCriteria` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MentorshipSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Project` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Score` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Team` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TeamMembership` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Track` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Announcement" DROP CONSTRAINT "Announcement_hackathonId_fkey";

-- DropForeignKey
ALTER TABLE "Hackathon" DROP CONSTRAINT "Hackathon_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Hackathon" DROP CONSTRAINT "Hackathon_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Judge" DROP CONSTRAINT "Judge_userId_fkey";

-- DropForeignKey
ALTER TABLE "JudgingCriteria" DROP CONSTRAINT "JudgingCriteria_judgeId_fkey";

-- DropForeignKey
ALTER TABLE "MentorshipSession" DROP CONSTRAINT "MentorshipSession_mentorId_fkey";

-- DropForeignKey
ALTER TABLE "MentorshipSession" DROP CONSTRAINT "MentorshipSession_teamId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_teamId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_trackId_fkey";

-- DropForeignKey
ALTER TABLE "Score" DROP CONSTRAINT "Score_judgeId_fkey";

-- DropForeignKey
ALTER TABLE "Score" DROP CONSTRAINT "Score_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_hackathonId_fkey";

-- DropForeignKey
ALTER TABLE "TeamMembership" DROP CONSTRAINT "TeamMembership_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TeamMembership" DROP CONSTRAINT "TeamMembership_userId_fkey";

-- DropForeignKey
ALTER TABLE "Track" DROP CONSTRAINT "Track_hackathonId_fkey";

-- DropTable
DROP TABLE "Announcement";

-- DropTable
DROP TABLE "Hackathon";

-- DropTable
DROP TABLE "Judge";

-- DropTable
DROP TABLE "JudgingCriteria";

-- DropTable
DROP TABLE "MentorshipSession";

-- DropTable
DROP TABLE "Project";

-- DropTable
DROP TABLE "Score";

-- DropTable
DROP TABLE "Team";

-- DropTable
DROP TABLE "TeamMembership";

-- DropTable
DROP TABLE "Track";
