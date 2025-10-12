-- CreateTable
CREATE TABLE "Skills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSkills" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "experienceLevel" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSkills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Skills_name_key" ON "Skills"("name");

-- CreateIndex
CREATE INDEX "Skills_category_idx" ON "Skills"("category");

-- CreateIndex
CREATE INDEX "Skills_popularity_idx" ON "Skills"("popularity");

-- CreateIndex
CREATE INDEX "Skills_isActive_idx" ON "Skills"("isActive");

-- CreateIndex
CREATE INDEX "Skills_name_idx" ON "Skills"("name");

-- CreateIndex
CREATE INDEX "UserSkills_userId_idx" ON "UserSkills"("userId");

-- CreateIndex
CREATE INDEX "UserSkills_skillId_idx" ON "UserSkills"("skillId");

-- CreateIndex
CREATE INDEX "UserSkills_experienceLevel_idx" ON "UserSkills"("experienceLevel");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkills_userId_skillId_key" ON "UserSkills"("userId", "skillId");

-- AddForeignKey
ALTER TABLE "UserSkills" ADD CONSTRAINT "UserSkills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkills" ADD CONSTRAINT "UserSkills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
