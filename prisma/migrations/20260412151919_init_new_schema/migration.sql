/*
  Warnings:

  - The values [ACTIVE,RENTED] on the enum `PropertyStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [BUYER,OWNER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `bathrooms` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `bedrooms` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `fullAddress` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `propertyType` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `squareFeet` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `street` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the `property_images` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `seller_requests` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[upiNumber]` on the table `properties` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `clientId` to the `properties` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idOrTin` to the `properties` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerName` to the `properties` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phoneNumber` to the `properties` table without a default value. This is not possible if the table is not empty.
  - Added the required column `upiNumber` to the `properties` table without a default value. This is not possible if the table is not empty.
  - Made the column `sector` on table `properties` required. This step will fail if there are existing NULL values in that column.
  - Made the column `cell` on table `properties` required. This step will fail if there are existing NULL values in that column.
  - Made the column `village` on table `properties` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_RENOVATION');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('HOUSE', 'APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "RoadAccessType" AS ENUM ('PAVED', 'UNPAVED', 'DIRT', 'UNDER_CONSTRUCTION');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'NEEDS_REVISION', 'REJECTED');

-- CreateEnum
CREATE TYPE "ValuationMethod" AS ENUM ('AI', 'MANUAL');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('PENDING', 'RESPONDED', 'CLOSED');

-- AlterEnum
BEGIN;
CREATE TYPE "PropertyStatus_new" AS ENUM ('PENDING', 'ASSIGNED', 'IN_FIELDWORK', 'UNDER_REVIEW', 'NEEDS_REVISION', 'APPROVED', 'PUBLISHED', 'SOLD', 'ARCHIVED');
ALTER TABLE "public"."properties" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "properties" ALTER COLUMN "status" TYPE "PropertyStatus_new" USING ("status"::text::"PropertyStatus_new");
ALTER TYPE "PropertyStatus" RENAME TO "PropertyStatus_old";
ALTER TYPE "PropertyStatus_new" RENAME TO "PropertyStatus";
DROP TYPE "public"."PropertyStatus_old";
ALTER TABLE "properties" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('CLIENT', 'DATA_COLLECTOR', 'SUPERVISOR', 'ADMIN');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CLIENT';
COMMIT;

-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT "properties_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "property_images" DROP CONSTRAINT "property_images_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "seller_requests" DROP CONSTRAINT "seller_requests_userId_fkey";

-- DropIndex
DROP INDEX "users_phone_key";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "newStatus" TEXT,
ADD COLUMN     "oldStatus" TEXT;

-- AlterTable
ALTER TABLE "properties" DROP COLUMN "bathrooms",
DROP COLUMN "bedrooms",
DROP COLUMN "description",
DROP COLUMN "fullAddress",
DROP COLUMN "latitude",
DROP COLUMN "longitude",
DROP COLUMN "ownerId",
DROP COLUMN "price",
DROP COLUMN "propertyType",
DROP COLUMN "squareFeet",
DROP COLUMN "street",
DROP COLUMN "title",
ADD COLUMN     "aiConfidence" DOUBLE PRECISION,
ADD COLUMN     "aiFactors" JSONB,
ADD COLUMN     "aiValuation" DOUBLE PRECISION,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'Rwanda',
ADD COLUMN     "idOrTin" TEXT NOT NULL,
ADD COLUMN     "ownerName" TEXT NOT NULL,
ADD COLUMN     "phoneNumber" TEXT NOT NULL,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "soldAt" TIMESTAMP(3),
ADD COLUMN     "statusChangedAt" TIMESTAMP(3),
ADD COLUMN     "upiNumber" TEXT NOT NULL,
ALTER COLUMN "sector" SET NOT NULL,
ALTER COLUMN "cell" SET NOT NULL,
ALTER COLUMN "village" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "addedById" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'CLIENT';

-- DropTable
DROP TABLE "property_images";

-- DropTable
DROP TABLE "seller_requests";

-- DropEnum
DROP TYPE "ApplicationStatus";

-- CreateTable
CREATE TABLE "images" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "filename" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "altText" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,
    "propertyId" TEXT,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailSentAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verificationToken" TEXT NOT NULL,
    "notes" TEXT,
    "propertyId" TEXT NOT NULL,
    "collectorId" TEXT NOT NULL,
    "assignedById" TEXT,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_data" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "gpsCapturedAt" TIMESTAMP(3),
    "gpsAccuracy" DOUBLE PRECISION,
    "propertyType" "PropertyType",
    "condition" "Condition",
    "bedrooms" INTEGER,
    "bathrooms" DOUBLE PRECISION,
    "landSize" DOUBLE PRECISION,
    "buildingSize" DOUBLE PRECISION,
    "yearBuilt" INTEGER,
    "parkingSpaces" INTEGER DEFAULT 0,
    "nearestSchoolKm" DOUBLE PRECISION,
    "nearestHospitalKm" DOUBLE PRECISION,
    "nearestTransportKm" DOUBLE PRECISION,
    "nearestMarketKm" DOUBLE PRECISION,
    "roadAccessType" "RoadAccessType",
    "valuationAmount" DOUBLE PRECISION,
    "valuationConfidence" DOUBLE PRECISION,
    "valuationMethod" "ValuationMethod",
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "field_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "propertyId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_properties" (
    "id" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "saved_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerPhone" TEXT,
    "message" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'PENDING',
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "images_propertyId_idx" ON "images"("propertyId");

-- CreateIndex
CREATE INDEX "images_uploadedBy_idx" ON "images"("uploadedBy");

-- CreateIndex
CREATE INDEX "images_isFeatured_idx" ON "images"("isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_verificationToken_key" ON "assignments"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_propertyId_key" ON "assignments"("propertyId");

-- CreateIndex
CREATE INDEX "assignments_collectorId_idx" ON "assignments"("collectorId");

-- CreateIndex
CREATE INDEX "assignments_assignedById_idx" ON "assignments"("assignedById");

-- CreateIndex
CREATE INDEX "assignments_verificationToken_idx" ON "assignments"("verificationToken");

-- CreateIndex
CREATE INDEX "assignments_assignedAt_idx" ON "assignments"("assignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "field_data_propertyId_key" ON "field_data"("propertyId");

-- CreateIndex
CREATE INDEX "field_data_propertyId_idx" ON "field_data"("propertyId");

-- CreateIndex
CREATE INDEX "field_data_submittedAt_idx" ON "field_data"("submittedAt");

-- CreateIndex
CREATE INDEX "reviews_propertyId_idx" ON "reviews"("propertyId");

-- CreateIndex
CREATE INDEX "reviews_supervisorId_idx" ON "reviews"("supervisorId");

-- CreateIndex
CREATE INDEX "reviews_createdAt_idx" ON "reviews"("createdAt");

-- CreateIndex
CREATE INDEX "saved_properties_userId_idx" ON "saved_properties"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_properties_userId_propertyId_key" ON "saved_properties"("userId", "propertyId");

-- CreateIndex
CREATE INDEX "inquiries_propertyId_idx" ON "inquiries"("propertyId");

-- CreateIndex
CREATE INDEX "inquiries_status_idx" ON "inquiries"("status");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "properties_upiNumber_key" ON "properties"("upiNumber");

-- CreateIndex
CREATE INDEX "properties_status_idx" ON "properties"("status");

-- CreateIndex
CREATE INDEX "properties_clientId_idx" ON "properties"("clientId");

-- CreateIndex
CREATE INDEX "properties_province_district_idx" ON "properties"("province", "district");

-- CreateIndex
CREATE INDEX "properties_createdAt_idx" ON "properties"("createdAt");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_data" ADD CONSTRAINT "field_data_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_properties" ADD CONSTRAINT "saved_properties_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_properties" ADD CONSTRAINT "saved_properties_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
