import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SessionStatus } from "@prisma/client";
import { sendExpirationWarning, sendExpiredNotification, isTwilioConfigured } from "@/lib/sms";
import { createExtensionToken, buildExtendUrl, buildCheckinUrl } from "@/lib/tokens";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for this cron job

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // If no secret configured, allow in development
  if (!cronSecret) {
    return process.env.NODE_ENV === "development";
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  // Verify this is a legitimate cron request
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isTwilioConfigured()) {
    return NextResponse.json({
      message: "Twilio not configured, skipping notifications",
      configured: false,
    });
  }

  const now = new Date();
  const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
  const twelveMinutesFromNow = new Date(now.getTime() + 12 * 60 * 1000);

  const results = {
    warnings: { sent: 0, failed: 0 },
    expired: { sent: 0, failed: 0 },
  };

  try {
    // 1) Find sessions expiring in 10-12 minutes that haven't been notified
    const sessionsNearExpiry = await prisma.session.findMany({
      where: {
        status: SessionStatus.paid,
        phoneNumber: { not: null },
        notificationSentAt: null,
        expiresAt: {
          gte: tenMinutesFromNow,
          lte: twelveMinutesFromNow,
        },
      },
      include: {
        spot: true,
      },
    });

    // Send expiration warnings
    for (const session of sessionsNearExpiry) {
      if (!session.phoneNumber || !session.expiresAt) continue;

      try {
        // Create extension token for this session
        const token = await createExtensionToken(session.id);
        const extendUrl = buildExtendUrl(token);

        const result = await sendExpirationWarning(
          session.phoneNumber,
          session.spot.label,
          session.expiresAt,
          extendUrl
        );

        if (result.success) {
          // Mark as notified
          await prisma.session.update({
            where: { id: session.id },
            data: { notificationSentAt: now },
          });
          results.warnings.sent++;
        } else {
          results.warnings.failed++;
        }
      } catch (error) {
        console.error(`Failed to send warning for session ${session.id}:`, error);
        results.warnings.failed++;
      }
    }

    // 2) Find sessions that just expired (within last 5 minutes) with phone numbers
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const sessionsJustExpired = await prisma.session.findMany({
      where: {
        status: SessionStatus.paid,
        phoneNumber: { not: null },
        notificationSentAt: { not: null }, // Only if we sent warning (they know about it)
        expiresAt: {
          gte: fiveMinutesAgo,
          lt: now,
        },
        // Use notes to track if expired notification was sent
        notes: { not: { contains: "expired_notification_sent" } },
      },
      include: {
        spot: true,
      },
    });

    // Send expired notifications
    for (const session of sessionsJustExpired) {
      if (!session.phoneNumber) continue;

      try {
        const checkinUrl = buildCheckinUrl();
        const result = await sendExpiredNotification(
          session.phoneNumber,
          session.spot.label,
          checkinUrl
        );

        if (result.success) {
          // Mark expired notification as sent
          const existingNotes = session.notes || "";
          await prisma.session.update({
            where: { id: session.id },
            data: {
              notes: existingNotes
                ? `${existingNotes}; expired_notification_sent`
                : "expired_notification_sent",
            },
          });
          results.expired.sent++;
        } else {
          results.expired.failed++;
        }
      } catch (error) {
        console.error(`Failed to send expired notification for session ${session.id}:`, error);
        results.expired.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (error: any) {
    console.error("Cron notification error:", error);
    return NextResponse.json(
      {
        error: "Failed to process notifications",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
