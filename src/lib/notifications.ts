import { prisma } from "./prisma";
import { SessionStatus } from "@prisma/client";
import { sendExpirationWarning, isTwilioConfigured } from "./sms";
import { createExtensionToken, buildExtendUrl } from "./tokens";

/**
 * Check and send notifications for sessions expiring soon.
 * This can be called on-demand from API routes to ensure notifications
 * are sent even without frequent cron jobs.
 *
 * Returns the number of notifications sent.
 */
export async function checkAndSendNotifications(): Promise<number> {
  if (!isTwilioConfigured()) {
    return 0;
  }

  const now = new Date();
  const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
  const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

  try {
    // Find sessions expiring in 10-15 minutes that haven't been notified
    const sessionsNearExpiry = await prisma.session.findMany({
      where: {
        status: SessionStatus.paid,
        phoneNumber: { not: null },
        notificationSentAt: null,
        expiresAt: {
          gte: tenMinutesFromNow,
          lte: fifteenMinutesFromNow,
        },
      },
      include: {
        spot: true,
      },
      take: 10, // Limit to prevent long execution
    });

    let sentCount = 0;

    for (const session of sessionsNearExpiry) {
      if (!session.phoneNumber || !session.expiresAt) continue;

      try {
        // Create extension token
        const token = await createExtensionToken(session.id);
        const extendUrl = buildExtendUrl(token);

        const result = await sendExpirationWarning(
          session.phoneNumber,
          session.spot.label,
          session.expiresAt,
          extendUrl
        );

        if (result.success) {
          await prisma.session.update({
            where: { id: session.id },
            data: { notificationSentAt: now },
          });
          sentCount++;
        }
      } catch (error) {
        console.error(`Failed to send notification for session ${session.id}:`, error);
      }
    }

    return sentCount;
  } catch (error) {
    console.error("Error checking notifications:", error);
    return 0;
  }
}

/**
 * Trigger notification check in the background (fire and forget).
 * Safe to call from any API route without blocking the response.
 */
export function triggerNotificationCheck(): void {
  // Run in background, don't await
  checkAndSendNotifications().catch((err) =>
    console.error("Background notification check failed:", err)
  );
}
