-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "jobTitle" TEXT,
    "company" TEXT,
    "location" TEXT,
    "website" TEXT,
    "githubUrl" TEXT,
    "linkedinUrl" TEXT,
    "twitterUrl" TEXT,
    "skills" TEXT[],
    "interests" TEXT[],
    "availableForMentoring" BOOLEAN NOT NULL DEFAULT false,
    "availableForHiring" BOOLEAN NOT NULL DEFAULT false,
    "availableForOfficeHours" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT,
    "languages" TEXT[],
    "yearsOfExperience" INTEGER,
    "telegramHandle" TEXT,
    "discordHandle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProject" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "githubUrl" TEXT,
    "liveUrl" TEXT,
    "imageUrl" TEXT,
    "technologies" TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "UserProfile_location_idx" ON "UserProfile"("location");

-- CreateIndex
CREATE INDEX "UserProfile_availableForMentoring_idx" ON "UserProfile"("availableForMentoring");

-- CreateIndex
CREATE INDEX "UserProfile_availableForHiring_idx" ON "UserProfile"("availableForHiring");

-- CreateIndex
CREATE INDEX "UserProfile_availableForOfficeHours_idx" ON "UserProfile"("availableForOfficeHours");

-- CreateIndex
CREATE INDEX "UserProject_profileId_idx" ON "UserProject"("profileId");

-- CreateIndex
CREATE INDEX "UserProject_featured_idx" ON "UserProject"("featured");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProject" ADD CONSTRAINT "UserProject_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
