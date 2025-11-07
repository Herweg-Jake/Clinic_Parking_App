/*
  Warnings:

  - You are about to drop the `SystemMeta` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('pending', 'approved_pt', 'paid', 'expired', 'void');

-- CreateEnum
CREATE TYPE "PermitKind" AS ENUM ('appointment', 'staff', 'long_term');

-- DropTable
DROP TABLE "public"."SystemMeta";

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "ownerEmail" TEXT,
    "ownerPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spot" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Spot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "status" "SessionStatus" NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL,
    "paymentId" TEXT,
    "notes" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "stripeCheckoutSessionId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permit" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "kind" "PermitKind" NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "meta" JSONB,

    CONSTRAINT "Permit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_licensePlate_key" ON "Vehicle"("licensePlate");

-- CreateIndex
CREATE INDEX "Vehicle_licensePlate_idx" ON "Vehicle"("licensePlate");

-- CreateIndex
CREATE UNIQUE INDEX "Spot_label_key" ON "Spot"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Session_paymentId_key" ON "Session"("paymentId");

-- CreateIndex
CREATE INDEX "Session_status_expiresAt_idx" ON "Session"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Session_vehicleId_startedAt_idx" ON "Session"("vehicleId", "startedAt");

-- CreateIndex
CREATE INDEX "Session_spotId_startedAt_idx" ON "Session"("spotId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeCheckoutSessionId_key" ON "Payment"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "Permit_vehicleId_validFrom_validTo_idx" ON "Permit"("vehicleId", "validFrom", "validTo");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permit" ADD CONSTRAINT "Permit_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
