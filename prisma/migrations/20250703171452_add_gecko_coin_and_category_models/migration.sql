-- CreateTable
CREATE TABLE "GeckoCoin" (
    "id" TEXT NOT NULL,
    "geckoId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "currentPrice" DOUBLE PRECISION,
    "marketCap" DOUBLE PRECISION,
    "marketCapRank" INTEGER,
    "fullyDilutedValuation" DOUBLE PRECISION,
    "totalVolume" DOUBLE PRECISION,
    "high24h" DOUBLE PRECISION,
    "low24h" DOUBLE PRECISION,
    "priceChange24h" DOUBLE PRECISION,
    "priceChangePercentage24h" DOUBLE PRECISION,
    "marketCapChange24h" DOUBLE PRECISION,
    "marketCapChangePercentage24h" DOUBLE PRECISION,
    "circulatingSupply" DOUBLE PRECISION,
    "totalSupply" DOUBLE PRECISION,
    "maxSupply" DOUBLE PRECISION,
    "ath" DOUBLE PRECISION,
    "athChangePercentage" DOUBLE PRECISION,
    "athDate" TIMESTAMP(3),
    "atl" DOUBLE PRECISION,
    "atlChangePercentage" DOUBLE PRECISION,
    "atlDate" TIMESTAMP(3),
    "roiTimes" DOUBLE PRECISION,
    "roiCurrency" TEXT,
    "roiPercentage" DOUBLE PRECISION,
    "lastUpdated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeckoCoin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorGeckoCoin" (
    "id" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "geckoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SponsorGeckoCoin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorCategory" (
    "id" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SponsorCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryGeckoCoin" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "geckoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryGeckoCoin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeckoCoin_geckoId_key" ON "GeckoCoin"("geckoId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SponsorGeckoCoin_sponsorId_geckoId_key" ON "SponsorGeckoCoin"("sponsorId", "geckoId");

-- CreateIndex
CREATE UNIQUE INDEX "SponsorCategory_sponsorId_categoryId_key" ON "SponsorCategory"("sponsorId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryGeckoCoin_categoryId_geckoId_key" ON "CategoryGeckoCoin"("categoryId", "geckoId");

-- AddForeignKey
ALTER TABLE "SponsorGeckoCoin" ADD CONSTRAINT "SponsorGeckoCoin_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorGeckoCoin" ADD CONSTRAINT "SponsorGeckoCoin_geckoId_fkey" FOREIGN KEY ("geckoId") REFERENCES "GeckoCoin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorCategory" ADD CONSTRAINT "SponsorCategory_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorCategory" ADD CONSTRAINT "SponsorCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryGeckoCoin" ADD CONSTRAINT "CategoryGeckoCoin_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryGeckoCoin" ADD CONSTRAINT "CategoryGeckoCoin_geckoId_fkey" FOREIGN KEY ("geckoId") REFERENCES "GeckoCoin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
