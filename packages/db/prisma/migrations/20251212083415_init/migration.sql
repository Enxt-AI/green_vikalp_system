-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE', 'LINKEDIN', 'REFERRAL', 'COLD_CALL', 'TRADE_SHOW', 'PARTNER', 'EMAIL_CAMPAIGN', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'ATTEMPTING_CONTACT', 'CONTACTED', 'QUALIFIED', 'NURTURING', 'DISQUALIFIED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "LeadPipelineStage" AS ENUM ('NEW', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CHURNED', 'PAUSED');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('QUALIFICATION', 'NEEDS_ANALYSIS', 'VALUE_PROPOSITION', 'PROPOSAL_PRICE_QUOTE', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'FOLLOW_UP', 'NOTE', 'STATUS_CHANGE', 'DOCUMENT_UPLOAD', 'TASK_COMPLETED', 'DEAL_CREATED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('GENERAL', 'CALL', 'EMAIL', 'FOLLOW_UP', 'PROPOSAL', 'CONTRACT');

-- CreateEnum
CREATE TYPE "FolderType" AS ENUM ('SHARED', 'PERSONAL');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SHARED', 'PERSONAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "needsPasswordChange" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "email" TEXT,
    "mobile" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'OTHER',
    "sourceDetails" TEXT,
    "pipelineStage" "LeadPipelineStage" NOT NULL DEFAULT 'NEW',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "score" INTEGER NOT NULL DEFAULT 0,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "tags" TEXT[],
    "ownerId" TEXT NOT NULL,
    "isConverted" BOOLEAN NOT NULL DEFAULT false,
    "convertedAt" TIMESTAMP(3),
    "convertedClientId" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "estimatedValue" DECIMAL(12,2),
    "initialNotes" TEXT,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "primaryContact" TEXT NOT NULL,
    "email" TEXT,
    "mobile" TEXT,
    "industry" TEXT,
    "domain" TEXT,
    "companySize" TEXT,
    "gstNumber" TEXT,
    "address" TEXT,
    "website" TEXT,
    "googleSheetUrl" TEXT,
    "notionPageUrl" TEXT,
    "slackChannel" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "lifetimeValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "accountManagerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "estimatedValue" DECIMAL(12,2),
    "leadConvertedAt" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalLink" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "value" DECIMAL(12,2) NOT NULL,
    "budget" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "dealType" TEXT,
    "industry" TEXT,
    "stage" "DealStage" NOT NULL DEFAULT 'QUALIFICATION',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "expectedCloseDate" TIMESTAMP(3),
    "actualCloseDate" TIMESTAMP(3),
    "nextSteps" TEXT,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "leadId" TEXT,
    "clientId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "meetingUrl" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "organizerId" TEXT NOT NULL,
    "leadId" TEXT,
    "clientId" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "type" "TaskType" NOT NULL DEFAULT 'GENERAL',
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "assignedToId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "leadId" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "isLink" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "leadId" TEXT,
    "clientId" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "leadId" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FolderType" NOT NULL DEFAULT 'SHARED',
    "parentId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedDocument" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'SHARED',
    "folderId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SharedFolders" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SharedFolders_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SharedDocuments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SharedDocuments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_convertedClientId_key" ON "Lead"("convertedClientId");

-- CreateIndex
CREATE INDEX "Lead_ownerId_pipelineStage_idx" ON "Lead"("ownerId", "pipelineStage");

-- CreateIndex
CREATE INDEX "Lead_ownerId_status_idx" ON "Lead"("ownerId", "status");

-- CreateIndex
CREATE INDEX "Lead_ownerId_isConverted_idx" ON "Lead"("ownerId", "isConverted");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_source_idx" ON "Lead"("source");

-- CreateIndex
CREATE INDEX "Lead_priority_idx" ON "Lead"("priority");

-- CreateIndex
CREATE INDEX "Lead_nextFollowUpAt_idx" ON "Lead"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "Lead_isConverted_idx" ON "Lead"("isConverted");

-- CreateIndex
CREATE INDEX "Client_accountManagerId_status_idx" ON "Client"("accountManagerId", "status");

-- CreateIndex
CREATE INDEX "Client_status_idx" ON "Client"("status");

-- CreateIndex
CREATE INDEX "Client_industry_idx" ON "Client"("industry");

-- CreateIndex
CREATE INDEX "ExternalLink_clientId_idx" ON "ExternalLink"("clientId");

-- CreateIndex
CREATE INDEX "Deal_clientId_stage_idx" ON "Deal"("clientId", "stage");

-- CreateIndex
CREATE INDEX "Deal_stage_idx" ON "Deal"("stage");

-- CreateIndex
CREATE INDEX "Deal_ownerId_stage_idx" ON "Deal"("ownerId", "stage");

-- CreateIndex
CREATE INDEX "Deal_ownerId_isDeleted_idx" ON "Deal"("ownerId", "isDeleted");

-- CreateIndex
CREATE INDEX "Deal_isDeleted_deletedAt_idx" ON "Deal"("isDeleted", "deletedAt");

-- CreateIndex
CREATE INDEX "Deal_expectedCloseDate_idx" ON "Deal"("expectedCloseDate");

-- CreateIndex
CREATE INDEX "Activity_leadId_occurredAt_idx" ON "Activity"("leadId", "occurredAt");

-- CreateIndex
CREATE INDEX "Activity_clientId_occurredAt_idx" ON "Activity"("clientId", "occurredAt");

-- CreateIndex
CREATE INDEX "Activity_createdById_idx" ON "Activity"("createdById");

-- CreateIndex
CREATE INDEX "Activity_isFollowUp_followUpDate_idx" ON "Activity"("isFollowUp", "followUpDate");

-- CreateIndex
CREATE INDEX "Meeting_organizerId_startTime_idx" ON "Meeting"("organizerId", "startTime");

-- CreateIndex
CREATE INDEX "Meeting_startTime_status_idx" ON "Meeting"("startTime", "status");

-- CreateIndex
CREATE INDEX "Task_assignedToId_isCompleted_idx" ON "Task"("assignedToId", "isCompleted");

-- CreateIndex
CREATE INDEX "Task_dueDate_isCompleted_idx" ON "Task"("dueDate", "isCompleted");

-- CreateIndex
CREATE INDEX "Task_assignedToId_dueDate_isCompleted_idx" ON "Task"("assignedToId", "dueDate", "isCompleted");

-- CreateIndex
CREATE INDEX "Document_leadId_idx" ON "Document"("leadId");

-- CreateIndex
CREATE INDEX "Document_clientId_idx" ON "Document"("clientId");

-- CreateIndex
CREATE INDEX "Note_leadId_createdAt_idx" ON "Note"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "Note_clientId_createdAt_idx" ON "Note"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "Note_isPinned_idx" ON "Note"("isPinned");

-- CreateIndex
CREATE INDEX "Folder_parentId_idx" ON "Folder"("parentId");

-- CreateIndex
CREATE INDEX "Folder_type_idx" ON "Folder"("type");

-- CreateIndex
CREATE INDEX "Folder_createdById_idx" ON "Folder"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedDocument_s3Key_key" ON "ManagedDocument"("s3Key");

-- CreateIndex
CREATE INDEX "ManagedDocument_folderId_idx" ON "ManagedDocument"("folderId");

-- CreateIndex
CREATE INDEX "ManagedDocument_type_idx" ON "ManagedDocument"("type");

-- CreateIndex
CREATE INDEX "ManagedDocument_uploadedById_idx" ON "ManagedDocument"("uploadedById");

-- CreateIndex
CREATE INDEX "ManagedDocument_s3Key_idx" ON "ManagedDocument"("s3Key");

-- CreateIndex
CREATE INDEX "_SharedFolders_B_index" ON "_SharedFolders"("B");

-- CreateIndex
CREATE INDEX "_SharedDocuments_B_index" ON "_SharedDocuments"("B");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedClientId_fkey" FOREIGN KEY ("convertedClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalLink" ADD CONSTRAINT "ExternalLink_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedDocument" ADD CONSTRAINT "ManagedDocument_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedDocument" ADD CONSTRAINT "ManagedDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SharedFolders" ADD CONSTRAINT "_SharedFolders_A_fkey" FOREIGN KEY ("A") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SharedFolders" ADD CONSTRAINT "_SharedFolders_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SharedDocuments" ADD CONSTRAINT "_SharedDocuments_A_fkey" FOREIGN KEY ("A") REFERENCES "ManagedDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SharedDocuments" ADD CONSTRAINT "_SharedDocuments_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
