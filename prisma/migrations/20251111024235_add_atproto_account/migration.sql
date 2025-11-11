-- CreateTable
CREATE TABLE "AtProtoAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "did" TEXT NOT NULL,
    "pdsUrl" TEXT NOT NULL,
    "accessJwt" TEXT,
    "refreshJwt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtProtoAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AtProtoAccount_userId_key" ON "AtProtoAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AtProtoAccount_did_key" ON "AtProtoAccount"("did");

-- CreateIndex
CREATE INDEX "AtProtoAccount_userId_idx" ON "AtProtoAccount"("userId");

-- CreateIndex
CREATE INDEX "AtProtoAccount_did_idx" ON "AtProtoAccount"("did");

-- CreateIndex
CREATE INDEX "AtProtoAccount_handle_idx" ON "AtProtoAccount"("handle");

-- AddForeignKey
ALTER TABLE "AtProtoAccount" ADD CONSTRAINT "AtProtoAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
