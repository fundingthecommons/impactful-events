-- CreateTable
CREATE TABLE "ApplicationOnboarding" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "eTicketUrl" TEXT,
    "eTicketFileName" TEXT,
    "healthInsuranceUrl" TEXT,
    "healthInsuranceFileName" TEXT,
    "participateExperiments" BOOLEAN NOT NULL DEFAULT false,
    "mintHypercert" BOOLEAN NOT NULL DEFAULT false,
    "interestedIncubation" BOOLEAN NOT NULL DEFAULT false,
    "dietaryRequirements" TEXT,
    "additionalComments" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationOnboarding_applicationId_key" ON "ApplicationOnboarding"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationOnboarding_applicationId_idx" ON "ApplicationOnboarding"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationOnboarding_completed_idx" ON "ApplicationOnboarding"("completed");

-- CreateIndex
CREATE INDEX "ApplicationOnboarding_submittedAt_idx" ON "ApplicationOnboarding"("submittedAt");

-- AddForeignKey
ALTER TABLE "ApplicationOnboarding" ADD CONSTRAINT "ApplicationOnboarding_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
