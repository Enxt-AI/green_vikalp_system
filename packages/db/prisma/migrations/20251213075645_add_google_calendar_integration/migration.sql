/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MeetingAttendeeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "googleEventId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "email" TEXT,
ADD COLUMN     "googleCalendarId" TEXT,
ADD COLUMN     "googleCalendarSynced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "googleRefreshToken" TEXT;

-- CreateTable
CREATE TABLE "MeetingAttendee" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "MeetingAttendeeStatus" NOT NULL DEFAULT 'PENDING',
    "googleEventId" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetingAttendee_userId_status_idx" ON "MeetingAttendee"("userId", "status");

-- CreateIndex
CREATE INDEX "MeetingAttendee_meetingId_idx" ON "MeetingAttendee"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingAttendee_meetingId_userId_key" ON "MeetingAttendee"("meetingId", "userId");

-- CreateIndex
CREATE INDEX "Meeting_googleEventId_idx" ON "Meeting"("googleEventId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- AddForeignKey
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
