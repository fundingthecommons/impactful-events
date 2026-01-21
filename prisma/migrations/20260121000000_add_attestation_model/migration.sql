-- CreateTable
CREATE TABLE "Attestation" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "schemaId" TEXT NOT NULL,
    "chain" TEXT NOT NULL DEFAULT 'optimism',
    "data" JSONB NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "isRetroactive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attestation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attestation_uid_key" ON "Attestation"("uid");

-- CreateIndex
CREATE INDEX "Attestation_repositoryId_idx" ON "Attestation"("repositoryId");

-- CreateIndex
CREATE INDEX "Attestation_uid_idx" ON "Attestation"("uid");

-- AddForeignKey
ALTER TABLE "Attestation" ADD CONSTRAINT "Attestation_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
