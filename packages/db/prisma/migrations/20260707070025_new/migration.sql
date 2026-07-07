/*
  Warnings:

  - The values [EMPLOYEE] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'MANAGER', 'TEAM_LEADER', 'TELE_CALLER', 'FIELD_EXECUTIVE');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'TELE_CALLER';
COMMIT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "notificationSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "contactNumber" TEXT,
ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "googleDriveFolderId" TEXT,
ADD COLUMN     "googleFormsUrl" TEXT,
ADD COLUMN     "googleSheetsSynced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "googleSheetsUrl" TEXT,
ALTER COLUMN "role" SET DEFAULT 'TELE_CALLER';

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "sourceCampaignId" TEXT,
    "stageId" TEXT,
    "tag" TEXT,
    "action" TEXT NOT NULL,
    "destinationCampaignId" TEXT,
    "destinationStageId" TEXT,
    "assignmentOption" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "lastRun" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "Workflow_createdById_idx" ON "Workflow"("createdById");

-- CreateIndex
CREATE INDEX "Workflow_sourceCampaignId_idx" ON "Workflow"("sourceCampaignId");

-- CreateIndex
CREATE INDEX "Workflow_status_idx" ON "Workflow"("status");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_destinationCampaignId_fkey" FOREIGN KEY ("destinationCampaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_destinationStageId_fkey" FOREIGN KEY ("destinationStageId") REFERENCES "PipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_sourceCampaignId_fkey" FOREIGN KEY ("sourceCampaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
