-- CreateEnum
CREATE TYPE "WalletChain" AS ENUM ('ETHEREUM', 'POLYGON', 'ARBITRUM', 'OPTIMISM', 'BASE', 'SOLANA', 'COSMOS', 'OTHER');

-- CreateTable
CREATE TABLE "WalletAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chain" "WalletChain" NOT NULL DEFAULT 'ETHEREUM',
    "label" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WalletAddress_userId_idx" ON "WalletAddress"("userId");

-- CreateIndex
CREATE INDEX "WalletAddress_address_idx" ON "WalletAddress"("address");

-- CreateIndex
CREATE INDEX "WalletAddress_chain_idx" ON "WalletAddress"("chain");

-- CreateIndex
CREATE INDEX "WalletAddress_isPrimary_idx" ON "WalletAddress"("isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "WalletAddress_userId_address_chain_key" ON "WalletAddress"("userId", "address", "chain");

-- AddForeignKey
ALTER TABLE "WalletAddress" ADD CONSTRAINT "WalletAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
