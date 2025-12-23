import { prisma } from "./prisma";
import crypto from "crypto";

const TOKEN_EXPIRY_MINUTES = 30;

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Create an extension token for a session
 */
export async function createExtensionToken(sessionId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

  await prisma.extensionToken.create({
    data: {
      token,
      sessionId,
      expiresAt,
    },
  });

  return token;
}

/**
 * Validate and consume an extension token
 * Returns sessionId if valid, null if invalid/expired/used
 */
export async function validateExtensionToken(token: string): Promise<string | null> {
  const extensionToken = await prisma.extensionToken.findUnique({
    where: { token },
  });

  if (!extensionToken) {
    return null;
  }

  // Check if expired
  if (extensionToken.expiresAt < new Date()) {
    return null;
  }

  // Check if already used
  if (extensionToken.usedAt) {
    return null;
  }

  return extensionToken.sessionId;
}

/**
 * Mark a token as used
 */
export async function markTokenUsed(token: string): Promise<void> {
  await prisma.extensionToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });
}

/**
 * Get the session ID from a token without marking it used
 * (for displaying extend page before payment)
 */
export async function getSessionFromToken(token: string): Promise<string | null> {
  return validateExtensionToken(token);
}

/**
 * Build extension URL for SMS
 */
export function buildExtendUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${baseUrl}/extend/${token}`;
}

/**
 * Build status URL for SMS
 */
export function buildStatusUrl(sessionId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${baseUrl}/status?session=${sessionId}`;
}

/**
 * Build check-in URL for SMS
 */
export function buildCheckinUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${baseUrl}/checkin`;
}

/**
 * Clean up expired tokens (can be run periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.extensionToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { usedAt: { not: null } },
      ],
    },
  });
  return result.count;
}
