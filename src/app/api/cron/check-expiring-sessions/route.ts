import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendSMS, formatExpirationMessage } from '@/lib/sms';
import { generateExtensionToken } from '@/app/api/extend/[sessionId]/route';

export const dynamic = 'force-dynamic';

/**
 * Cron job endpoint to check for expiring parking sessions and send SMS notifications
 * Should be called every 5 minutes via a cron service (e.g., Vercel Cron, GitHub Actions, etc.)
 *
 * Authorization: Requires CRON_SECRET environment variable to match
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

    // Find paid sessions that:
    // 1. Are expiring in 10-15 minutes
    // 2. Haven't been notified yet
    // 3. Have a phone number on the vehicle
    const expiringSessions = await prisma.session.findMany({
      where: {
        status: 'paid',
        expiresAt: {
          gte: tenMinutesFromNow,
          lte: fifteenMinutesFromNow,
        },
        smsNotificationSentAt: null,
        vehicle: {
          ownerPhone: {
            not: null,
          },
        },
      },
      include: {
        spot: true,
        vehicle: true,
      },
    });

    console.log(`Found ${expiringSessions.length} sessions expiring soon`);

    const results = [];

    for (const session of expiringSessions) {
      if (!session.vehicle.ownerPhone || !session.expiresAt) {
        continue;
      }

      try {
        // Calculate minutes remaining
        const minutesRemaining = Math.round(
          (session.expiresAt.getTime() - now.getTime()) / (60 * 1000)
        );

        // Generate extension URL
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const token = generateExtensionToken(session.id);
        const extensionUrl = `${baseUrl}/extend/${session.id}?token=${token}`;

        // Format and send SMS
        const message = formatExpirationMessage(
          session.spot.label,
          minutesRemaining,
          extensionUrl
        );

        const sent = await sendSMS({
          to: session.vehicle.ownerPhone,
          message,
        });

        if (sent) {
          // Mark as notified
          await prisma.session.update({
            where: { id: session.id },
            data: { smsNotificationSentAt: now },
          });

          results.push({
            sessionId: session.id,
            plate: session.vehicle.licensePlate,
            spot: session.spot.label,
            status: 'sent',
          });

          console.log(`SMS sent for session ${session.id} (${session.spot.label})`);
        } else {
          results.push({
            sessionId: session.id,
            plate: session.vehicle.licensePlate,
            spot: session.spot.label,
            status: 'failed',
          });
        }
      } catch (error) {
        console.error(`Error processing session ${session.id}:`, error);
        results.push({
          sessionId: session.id,
          plate: session.vehicle.licensePlate,
          spot: session.spot.label,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      checkedAt: now.toISOString(),
      sessionsFound: expiringSessions.length,
      results,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Support POST as well for some cron services
  return GET(request);
}
