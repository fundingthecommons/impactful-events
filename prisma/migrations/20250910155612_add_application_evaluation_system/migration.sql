-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "ReviewStage" AS ENUM ('SCREENING', 'DETAILED_REVIEW', 'VIDEO_REVIEW', 'CONSENSUS', 'FINAL_DECISION');

-- CreateEnum
CREATE TYPE "CriteriaCategory" AS ENUM ('TECHNICAL', 'PROJECT', 'COMMUNITY_FIT', 'VIDEO', 'OVERALL');

-- CreateTable
CREATE TABLE "EvaluationCriteria" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "CriteriaCategory" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "minScore" INTEGER NOT NULL DEFAULT 1,
    "maxScore" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationCriteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewerAssignment" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "stage" "ReviewStage" NOT NULL DEFAULT 'SCREENING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "ReviewerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationEvaluation" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'PENDING',
    "stage" "ReviewStage" NOT NULL,
    "overallScore" DOUBLE PRECISION,
    "overallComments" TEXT,
    "recommendation" TEXT,
    "confidence" INTEGER,
    "timeSpentMinutes" INTEGER,
    "videoWatched" BOOLEAN NOT NULL DEFAULT false,
    "videoTimestamp" TEXT,
    "videoQuality" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ApplicationEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationScore" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "criteriaId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationComment" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "questionKey" TEXT,
    "comment" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewConsensus" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "finalDecision" TEXT,
    "consensusScore" DOUBLE PRECISION,
    "discussionNotes" TEXT,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewConsensus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationCriteria_name_key" ON "EvaluationCriteria"("name");

-- CreateIndex
CREATE INDEX "EvaluationCriteria_category_idx" ON "EvaluationCriteria"("category");

-- CreateIndex
CREATE INDEX "EvaluationCriteria_isActive_idx" ON "EvaluationCriteria"("isActive");

-- CreateIndex
CREATE INDEX "EvaluationCriteria_order_idx" ON "EvaluationCriteria"("order");

-- CreateIndex
CREATE INDEX "ReviewerAssignment_reviewerId_idx" ON "ReviewerAssignment"("reviewerId");

-- CreateIndex
CREATE INDEX "ReviewerAssignment_stage_idx" ON "ReviewerAssignment"("stage");

-- CreateIndex
CREATE INDEX "ReviewerAssignment_priority_idx" ON "ReviewerAssignment"("priority");

-- CreateIndex
CREATE INDEX "ReviewerAssignment_dueDate_idx" ON "ReviewerAssignment"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewerAssignment_applicationId_reviewerId_stage_key" ON "ReviewerAssignment"("applicationId", "reviewerId", "stage");

-- CreateIndex
CREATE INDEX "ApplicationEvaluation_reviewerId_idx" ON "ApplicationEvaluation"("reviewerId");

-- CreateIndex
CREATE INDEX "ApplicationEvaluation_status_idx" ON "ApplicationEvaluation"("status");

-- CreateIndex
CREATE INDEX "ApplicationEvaluation_stage_idx" ON "ApplicationEvaluation"("stage");

-- CreateIndex
CREATE INDEX "ApplicationEvaluation_overallScore_idx" ON "ApplicationEvaluation"("overallScore");

-- CreateIndex
CREATE INDEX "ApplicationEvaluation_recommendation_idx" ON "ApplicationEvaluation"("recommendation");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationEvaluation_applicationId_reviewerId_stage_key" ON "ApplicationEvaluation"("applicationId", "reviewerId", "stage");

-- CreateIndex
CREATE INDEX "EvaluationScore_score_idx" ON "EvaluationScore"("score");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationScore_evaluationId_criteriaId_key" ON "EvaluationScore"("evaluationId", "criteriaId");

-- CreateIndex
CREATE INDEX "EvaluationComment_evaluationId_idx" ON "EvaluationComment"("evaluationId");

-- CreateIndex
CREATE INDEX "EvaluationComment_questionKey_idx" ON "EvaluationComment"("questionKey");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewConsensus_applicationId_key" ON "ReviewConsensus"("applicationId");

-- CreateIndex
CREATE INDEX "ReviewConsensus_finalDecision_idx" ON "ReviewConsensus"("finalDecision");

-- CreateIndex
CREATE INDEX "ReviewConsensus_consensusScore_idx" ON "ReviewConsensus"("consensusScore");

-- AddForeignKey
ALTER TABLE "ReviewerAssignment" ADD CONSTRAINT "ReviewerAssignment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewerAssignment" ADD CONSTRAINT "ReviewerAssignment_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvaluation" ADD CONSTRAINT "ApplicationEvaluation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvaluation" ADD CONSTRAINT "ApplicationEvaluation_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvaluation" ADD CONSTRAINT "ApplicationEvaluation_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ReviewerAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationScore" ADD CONSTRAINT "EvaluationScore_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "ApplicationEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationScore" ADD CONSTRAINT "EvaluationScore_criteriaId_fkey" FOREIGN KEY ("criteriaId") REFERENCES "EvaluationCriteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationComment" ADD CONSTRAINT "EvaluationComment_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "ApplicationEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewConsensus" ADD CONSTRAINT "ReviewConsensus_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewConsensus" ADD CONSTRAINT "ReviewConsensus_decidedBy_fkey" FOREIGN KEY ("decidedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
