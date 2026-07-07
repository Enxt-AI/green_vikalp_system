/*
  Warnings:

  - You are about to drop the column `status` on the `Lead` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadPipelineStage" ADD VALUE 'QUALIFIED';
ALTER TYPE "LeadPipelineStage" ADD VALUE 'DISQUALIFIED';
ALTER TYPE "LeadPipelineStage" ADD VALUE 'CONVERTED';

-- DropIndex
DROP INDEX "Lead_ownerId_status_idx";

-- DropIndex
DROP INDEX "Lead_status_idx";

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "status";

-- DropEnum
DROP TYPE "LeadStatus";
