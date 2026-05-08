-- AlterTable: add citedByBadge and reason to Ticket
ALTER TABLE "Ticket" ADD COLUMN "citedByBadge" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "reason" TEXT;

-- CreateTable: Officer
CREATE TABLE "Officer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "badgeNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Officer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Officer_badgeNumber_key" ON "Officer"("badgeNumber");
CREATE INDEX "Officer_badgeNumber_idx" ON "Officer"("badgeNumber");
