-- AlterTable: add citedBy to Ticket
ALTER TABLE "Ticket" ADD COLUMN "citedBy" TEXT;

-- CreateTable: Business
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "monthlyFeeCents" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Validation
CREATE TABLE "Validation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "plate" TEXT,
    "spot" TEXT,
    "sessionId" TEXT,
    "hours" INTEGER NOT NULL DEFAULT 1,
    "validatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Validation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Business_code_key" ON "Business"("code");
CREATE INDEX "Business_code_idx" ON "Business"("code");
CREATE INDEX "Validation_businessId_createdAt_idx" ON "Validation"("businessId", "createdAt");
CREATE INDEX "Validation_sessionId_idx" ON "Validation"("sessionId");

-- AddForeignKey
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Cleanup: remove any spot labeled "A0" so spots are consistently A1-A20.
-- Only delete if no sessions reference it (RESTRICT will fail otherwise, which is intentional).
DELETE FROM "Spot" WHERE "label" = 'A0' AND NOT EXISTS (
    SELECT 1 FROM "Session" WHERE "Session"."spotId" = "Spot"."id"
);
