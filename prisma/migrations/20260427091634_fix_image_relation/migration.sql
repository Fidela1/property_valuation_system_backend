/*
  Warnings:

  - You are about to drop the column `filename` on the `images` table. All the data in the column will be lost.
  - You are about to drop the column `height` on the `images` table. All the data in the column will be lost.
  - You are about to drop the column `uploadedAt` on the `images` table. All the data in the column will be lost.
  - You are about to drop the column `width` on the `images` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "images_isFeatured_idx";

-- AlterTable
ALTER TABLE "field_data" ADD COLUMN     "floodRisk" BOOLEAN DEFAULT false,
ADD COLUMN     "floorMaterial" TEXT,
ADD COLUMN     "hasElectricity" BOOLEAN DEFAULT true,
ADD COLUMN     "hasWaterSupply" BOOLEAN DEFAULT true,
ADD COLUMN     "hasWaterTank" BOOLEAN DEFAULT false,
ADD COLUMN     "landSlope" TEXT,
ADD COLUMN     "propertyCategory" TEXT,
ADD COLUMN     "roofType" TEXT;

-- AlterTable
ALTER TABLE "images" DROP COLUMN "filename",
DROP COLUMN "height",
DROP COLUMN "uploadedAt",
DROP COLUMN "width";
