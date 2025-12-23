-- AlterTable: Add notification tracking fields to Session
ALTER TABLE "Session" ADD COLUMN "phoneNumber" TEXT;
ALTER TABLE "Session" ADD COLUMN "notificationSentAt" TIMESTAMP(3);
