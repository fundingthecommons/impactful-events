-- CreateTable
CREATE TABLE "ReviewerCompetency" (
    "id" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "category" "CriteriaCategory" NOT NULL,
    "competencyLevel" INTEGER NOT NULL DEFAULT 3,
    "baseWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "notes" TEXT,
    "assignedBy" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewerCompetency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewerCompetency_reviewerId_idx" ON "ReviewerCompetency"("reviewerId");

-- CreateIndex
CREATE INDEX "ReviewerCompetency_category_idx" ON "ReviewerCompetency"("category");

-- CreateIndex
CREATE INDEX "ReviewerCompetency_competencyLevel_idx" ON "ReviewerCompetency"("competencyLevel");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewerCompetency_reviewerId_category_key" ON "ReviewerCompetency"("reviewerId", "category");

-- AddForeignKey
ALTER TABLE "ReviewerCompetency" ADD CONSTRAINT "ReviewerCompetency_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewerCompetency" ADD CONSTRAINT "ReviewerCompetency_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
