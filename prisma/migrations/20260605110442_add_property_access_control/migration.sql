-- CreateEnum
CREATE TYPE "AccessType" AS ENUM ('VIEW_ONLY', 'REQUEST_VALUATION', 'TRACK_PROGRESS', 'FULL_ACCESS');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'FINACIAL_INSTITUTION';

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bankId" TEXT;

-- CreateTable
CREATE TABLE "property_access" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "accessType" "AccessType" NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "accessRequestedAt" TIMESTAMP(3),
    "accessApprovedAt" TIMESTAMP(3),
    "clientConsent" BOOLEAN,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "property_access_propertyId_institutionId_key" ON "property_access"("propertyId", "institutionId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_access" ADD CONSTRAINT "property_access_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_access" ADD CONSTRAINT "property_access_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_access" ADD CONSTRAINT "property_access_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
