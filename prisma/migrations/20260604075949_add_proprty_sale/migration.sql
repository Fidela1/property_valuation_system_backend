-- DropIndex
DROP INDEX "field_data_submittedAt_idx";

-- AlterTable
ALTER TABLE "field_data" ADD COLUMN     "daysOnMarket" INTEGER,
ADD COLUMN     "furnishingStatus" TEXT,
ADD COLUMN     "inquiryCount" INTEGER DEFAULT 0,
ADD COLUMN     "interestCount" INTEGER DEFAULT 0,
ADD COLUMN     "lastSoldNearbyPrice" DOUBLE PRECISION,
ADD COLUMN     "listingDate" TIMESTAMP(3),
ADD COLUMN     "luxuryScore" DOUBLE PRECISION,
ADD COLUMN     "marketTrend" TEXT,
ADD COLUMN     "microZone" TEXT,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "noiseLevel" TEXT,
ADD COLUMN     "pricePerSqm" DOUBLE PRECISION,
ADD COLUMN     "renovationLevel" DOUBLE PRECISION,
ADD COLUMN     "safetyIndex" DOUBLE PRECISION,
ADD COLUMN     "saveCount" INTEGER DEFAULT 0,
ADD COLUMN     "urbanDensity" TEXT,
ADD COLUMN     "viewQualityScore" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "PropertySale" (
    "id" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "sector" TEXT,
    "cell" TEXT,
    "landSize" DOUBLE PRECISION NOT NULL,
    "buildingSize" DOUBLE PRECISION,
    "bedrooms" INTEGER,
    "bathrooms" DOUBLE PRECISION,
    "propertyType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "yearBuilt" INTEGER,
    "floorMaterial" TEXT,
    "roofType" TEXT,
    "hasGarden" BOOLEAN,
    "hasFence" BOOLEAN,
    "hasGate" BOOLEAN,
    "roadAccessType" TEXT NOT NULL,
    "nearestSchoolKm" DOUBLE PRECISION,
    "nearestHospitalKm" DOUBLE PRECISION,
    "nearestMarketKm" DOUBLE PRECISION,
    "soldPrice" DOUBLE PRECISION NOT NULL,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertySale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertySale_district_idx" ON "PropertySale"("district");

-- CreateIndex
CREATE INDEX "PropertySale_soldAt_idx" ON "PropertySale"("soldAt");

-- CreateIndex
CREATE INDEX "field_data_latitude_longitude_idx" ON "field_data"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "field_data_microZone_idx" ON "field_data"("microZone");

-- CreateIndex
CREATE INDEX "field_data_listingDate_idx" ON "field_data"("listingDate");
