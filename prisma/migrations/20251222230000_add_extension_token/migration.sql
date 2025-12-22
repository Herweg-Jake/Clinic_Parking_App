-- CreateTable: ExtensionToken for SMS extension links
CREATE TABLE "ExtensionToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtensionToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExtensionToken_token_key" ON "ExtensionToken"("token");

-- CreateIndex
CREATE INDEX "ExtensionToken_token_idx" ON "ExtensionToken"("token");

-- CreateIndex
CREATE INDEX "ExtensionToken_sessionId_idx" ON "ExtensionToken"("sessionId");
