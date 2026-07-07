/*
  Warnings:

  - You are about to drop the column `clientId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `companyName` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `convertedAt` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `convertedClientId` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedValue` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `isConverted` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `pipelineStage` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `sourceDetails` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `Meeting` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the `Activity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Deal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExternalLink` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `assignedToId` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `campaignId` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currentStageId` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PipelineType" AS ENUM ('BUYER', 'SELLER', 'INVESTOR', 'RENTER');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LeadType" AS ENUM ('BUYER', 'SELLER', 'INVESTOR', 'RENTER', 'BUYER_SELLER');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('HOUSE', 'CONDO', 'TOWNHOUSE', 'LAND', 'COMMERCIAL', 'MULTI_FAMILY', 'MANUFACTURED');

-- CreateEnum
CREATE TYPE "MoveInTimeline" AS ENUM ('ASAP', 'ONE_TO_THREE_MONTHS', 'THREE_TO_SIX_MONTHS', 'SIX_TO_TWELVE_MONTHS', 'OVER_A_YEAR', 'JUST_BROWSING');

-- CreateEnum
CREATE TYPE "HousingStatus" AS ENUM ('RENTING', 'OWNS_HOME', 'LIVING_WITH_FAMILY', 'OTHER');

-- CreateEnum
CREATE TYPE "PreApprovalStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PRE_QUALIFIED', 'PRE_APPROVED', 'NOT_NEEDED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'PENDING', 'SOLD', 'OFF_MARKET', 'COMING_SOON');

-- CreateEnum
CREATE TYPE "InterestStatus" AS ENUM ('INTERESTED', 'TOURED', 'FAVORITED', 'OFFER_MADE', 'OFFER_ACCEPTED', 'OFFER_REJECTED', 'NOT_INTERESTED');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('CALL', 'EMAIL', 'SMS', 'WHATSAPP', 'MEETING', 'NOTE', 'PROPERTY_SHOWING', 'OFFER_SUBMITTED', 'STAGE_CHANGE', 'DOCUMENT_SENT', 'AUTOMATED_EMAIL', 'AUTOMATED_SMS');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('INBOUND', 'OUTBOUND');

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_leadId_fkey";

-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_accountManagerId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_deletedById_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_clientId_fkey";

-- DropForeignKey
ALTER TABLE "ExternalLink" DROP CONSTRAINT "ExternalLink_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_convertedClientId_fkey";

-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Meeting" DROP CONSTRAINT "Meeting_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_clientId_fkey";

-- DropIndex
DROP INDEX "Document_clientId_idx";

-- DropIndex
DROP INDEX "Lead_convertedClientId_key";

-- DropIndex
DROP INDEX "Lead_isConverted_idx";

-- DropIndex
DROP INDEX "Lead_ownerId_isConverted_idx";

-- DropIndex
DROP INDEX "Lead_ownerId_pipelineStage_idx";

-- DropIndex
DROP INDEX "Lead_priority_idx";

-- DropIndex
DROP INDEX "Lead_source_idx";

-- DropIndex
DROP INDEX "Note_clientId_createdAt_idx";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "clientId";

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "companyName",
DROP COLUMN "convertedAt",
DROP COLUMN "convertedClientId",
DROP COLUMN "estimatedValue",
DROP COLUMN "isConverted",
DROP COLUMN "name",
DROP COLUMN "ownerId",
DROP COLUMN "pipelineStage",
DROP COLUMN "source",
DROP COLUMN "sourceDetails",
ADD COLUMN     "alternatePhone" TEXT,
ADD COLUMN     "archivedReason" TEXT,
ADD COLUMN     "assignedToId" TEXT NOT NULL,
ADD COLUMN     "bathroomsMin" DECIMAL(3,1),
ADD COLUMN     "bedroomsMin" INTEGER,
ADD COLUMN     "budgetMax" DECIMAL(12,2),
ADD COLUMN     "budgetMin" DECIMAL(12,2),
ADD COLUMN     "campaignId" TEXT NOT NULL,
ADD COLUMN     "currentHousingStatus" "HousingStatus",
ADD COLUMN     "currentStageId" TEXT NOT NULL,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "leadType" "LeadType" NOT NULL DEFAULT 'BUYER',
ADD COLUMN     "locationPreference" TEXT[],
ADD COLUMN     "moveInTimeline" "MoveInTimeline",
ADD COLUMN     "preApprovalAmount" DECIMAL(12,2),
ADD COLUMN     "preApprovalStatus" "PreApprovalStatus",
ADD COLUMN     "propertyTypePreference" "PropertyType"[],
ADD COLUMN     "squareFeetMin" INTEGER;

-- AlterTable
ALTER TABLE "Meeting" DROP COLUMN "clientId";

-- AlterTable
ALTER TABLE "Note" DROP COLUMN "clientId";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "clientId";

-- DropTable
DROP TABLE "Activity";

-- DropTable
DROP TABLE "Client";

-- DropTable
DROP TABLE "Deal";

-- DropTable
DROP TABLE "ExternalLink";

-- DropEnum
DROP TYPE "ActivityType";

-- DropEnum
DROP TYPE "ClientStatus";

-- DropEnum
DROP TYPE "DealStage";

-- DropEnum
DROP TYPE "LeadPipelineStage";

-- DropEnum
DROP TYPE "LeadSource";

-- CreateTable
CREATE TABLE "Pipeline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "PipelineType" NOT NULL DEFAULT 'BUYER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pipelineId" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "budget" DECIMAL(12,2),
    "actualSpend" DECIMAL(12,2),
    "source" TEXT,
    "sourceDetails" TEXT,
    "assignedToIds" TEXT[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'USA',
    "propertyType" "PropertyType" NOT NULL,
    "listingStatus" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "price" DECIMAL(12,2) NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" DECIMAL(3,1) NOT NULL,
    "squareFeet" INTEGER,
    "lotSize" DECIMAL(10,2),
    "yearBuilt" INTEGER,
    "mlsNumber" TEXT,
    "description" TEXT,
    "photos" TEXT[],
    "virtualTourUrl" TEXT,
    "hoaFees" DECIMAL(10,2),
    "propertyTax" DECIMAL(10,2),
    "features" TEXT[],
    "listedById" TEXT,
    "listedDate" TIMESTAMP(3),
    "soldDate" TIMESTAMP(3),
    "soldPrice" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyInterest" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "status" "InterestStatus" NOT NULL DEFAULT 'INTERESTED',
    "notes" TEXT,
    "viewedAt" TIMESTAMP(3),
    "rating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "subject" TEXT,
    "content" TEXT,
    "direction" "Direction" NOT NULL DEFAULT 'OUTBOUND',
    "duration" INTEGER,
    "recordingUrl" TEXT,
    "emailFrom" TEXT,
    "emailTo" TEXT,
    "emailCc" TEXT,
    "phoneNumber" TEXT,
    "createdById" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AssignedCampaigns" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AssignedCampaigns_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Pipeline_type_isActive_idx" ON "Pipeline"("type", "isActive");

-- CreateIndex
CREATE INDEX "Pipeline_createdById_idx" ON "Pipeline"("createdById");

-- CreateIndex
CREATE INDEX "PipelineStage_pipelineId_order_idx" ON "PipelineStage"("pipelineId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineStage_pipelineId_order_key" ON "PipelineStage"("pipelineId", "order");

-- CreateIndex
CREATE INDEX "Campaign_pipelineId_status_idx" ON "Campaign"("pipelineId", "status");

-- CreateIndex
CREATE INDEX "Campaign_status_startDate_idx" ON "Campaign"("status", "startDate");

-- CreateIndex
CREATE INDEX "Campaign_createdById_idx" ON "Campaign"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Property_mlsNumber_key" ON "Property"("mlsNumber");

-- CreateIndex
CREATE INDEX "Property_listingStatus_propertyType_idx" ON "Property"("listingStatus", "propertyType");

-- CreateIndex
CREATE INDEX "Property_city_state_zipCode_idx" ON "Property"("city", "state", "zipCode");

-- CreateIndex
CREATE INDEX "Property_price_bedrooms_bathrooms_idx" ON "Property"("price", "bedrooms", "bathrooms");

-- CreateIndex
CREATE INDEX "Property_mlsNumber_idx" ON "Property"("mlsNumber");

-- CreateIndex
CREATE INDEX "PropertyInterest_leadId_status_idx" ON "PropertyInterest"("leadId", "status");

-- CreateIndex
CREATE INDEX "PropertyInterest_propertyId_status_idx" ON "PropertyInterest"("propertyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyInterest_leadId_propertyId_key" ON "PropertyInterest"("leadId", "propertyId");

-- CreateIndex
CREATE INDEX "Interaction_leadId_occurredAt_idx" ON "Interaction"("leadId", "occurredAt");

-- CreateIndex
CREATE INDEX "Interaction_type_occurredAt_idx" ON "Interaction"("type", "occurredAt");

-- CreateIndex
CREATE INDEX "Interaction_createdById_idx" ON "Interaction"("createdById");

-- CreateIndex
CREATE INDEX "_AssignedCampaigns_B_index" ON "_AssignedCampaigns"("B");

-- CreateIndex
CREATE INDEX "Lead_campaignId_currentStageId_idx" ON "Lead"("campaignId", "currentStageId");

-- CreateIndex
CREATE INDEX "Lead_assignedToId_isArchived_idx" ON "Lead"("assignedToId", "isArchived");

-- CreateIndex
CREATE INDEX "Lead_mobile_idx" ON "Lead"("mobile");

-- CreateIndex
CREATE INDEX "Lead_leadType_currentStageId_idx" ON "Lead"("leadType", "currentStageId");

-- CreateIndex
CREATE INDEX "Lead_score_priority_idx" ON "Lead"("score", "priority");

-- AddForeignKey
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_currentStageId_fkey" FOREIGN KEY ("currentStageId") REFERENCES "PipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_listedById_fkey" FOREIGN KEY ("listedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyInterest" ADD CONSTRAINT "PropertyInterest_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyInterest" ADD CONSTRAINT "PropertyInterest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssignedCampaigns" ADD CONSTRAINT "_AssignedCampaigns_A_fkey" FOREIGN KEY ("A") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssignedCampaigns" ADD CONSTRAINT "_AssignedCampaigns_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
