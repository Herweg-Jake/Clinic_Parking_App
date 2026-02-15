import { NextResponse } from "next/server";
import Twilio from "twilio";
import { prisma } from "@/lib/prisma";
import { SessionStatus } from "@prisma/client";
import { sendSMS } from "@/lib/sms";
import { createExtensionToken, buildExtendUrl, buildCheckinUrl } from "@/lib/tokens";
import { formatPhoneE164 } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/**
 * Verify incoming Twilio request signature.
 * In production, requires TWILIO_AUTH_TOKEN to be set.
 * Skipped in development if auth token is not configured.
 */
function verifyTwilioSignature(req: Request, params: Record<string, string>): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    // Allow in development when Twilio isn't configured
    return process.env.NODE_ENV === "development";
  }

  const signature = req.headers.get("x-twilio-signature");
  if (!signature) return false;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/webhooks/twilio`;

  return Twilio.validateRequest(authToken, signature, url, params);
}

/**
 * Twilio webhook for incoming SMS messages.
 * Handles commands like EXTEND, STATUS, STOP.
 *
 * Configure in Twilio Console:
 * - Messaging > Phone Numbers > Your Number > Webhook URL
 * - Set to: https://your-app.vercel.app/api/webhooks/twilio
 * - Method: POST
 */
export async function POST(req: Request) {
  try {
    // Parse form data from Twilio
    const formData = await req.formData();

    // Convert form data to plain object for signature validation
    const formParams: Record<string, string> = {};
    formData.forEach((value, key) => {
      formParams[key] = String(value);
    });

    // Verify Twilio request signature to prevent spoofed requests
    if (!verifyTwilioSignature(req, formParams)) {
      console.warn("[Twilio Webhook] Invalid signature — rejecting request");
      return new NextResponse("Forbidden", { status: 403 });
    }
    const from = formData.get("From") as string;
    const body = (formData.get("Body") as string || "").trim().toUpperCase();

    if (!from || !body) {
      return twimlResponse("Invalid request");
    }

    // Normalize phone number
    const phoneDigits = from.replace(/\D/g, "");
    const phoneFormats = [
      from,
      formatPhoneE164(from),
      `+1${phoneDigits.slice(-10)}`,
      phoneDigits.slice(-10),
    ];

    // Find active session for this phone number
    const session = await prisma.session.findFirst({
      where: {
        phoneNumber: { in: phoneFormats },
        status: SessionStatus.paid,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } }, // Include recently expired
        ],
      },
      include: {
        spot: true,
        vehicle: true,
      },
      orderBy: { startedAt: "desc" },
    });

    // Handle STOP command (opt-out)
    if (body === "STOP" || body === "UNSUBSCRIBE" || body === "CANCEL") {
      // Twilio handles STOP automatically, but we can acknowledge
      return twimlResponse(
        "You've been unsubscribed from Nevada PT Parking notifications. " +
        "Reply START to re-subscribe."
      );
    }

    // Handle START command (opt-in)
    if (body === "START" || body === "SUBSCRIBE") {
      return twimlResponse(
        "You're subscribed to Nevada PT Parking notifications. " +
        "Reply STATUS to check your parking, or EXTEND to add time."
      );
    }

    // Handle HELP command
    if (body === "HELP" || body === "?") {
      return twimlResponse(
        "Nevada PT Parking Commands:\n" +
        "STATUS - Check parking time\n" +
        "EXTEND - Get link to add time\n" +
        "EXTEND 2 - Get link for 2 hours\n" +
        "STOP - Unsubscribe"
      );
    }

    // Handle STATUS command
    if (body === "STATUS" || body === "CHECK" || body === "TIME") {
      if (!session) {
        return twimlResponse(
          "No active parking session found for this phone number. " +
          "Visit " + buildCheckinUrl() + " to start parking."
        );
      }

      const timeRemaining = session.expiresAt
        ? Math.max(0, Math.round((session.expiresAt.getTime() - Date.now()) / 60000))
        : null;

      if (timeRemaining === null) {
        return twimlResponse(
          `Spot ${session.spot.label} (${session.vehicle.licensePlate}): Active, no time limit.`
        );
      } else if (timeRemaining <= 0) {
        return twimlResponse(
          `Spot ${session.spot.label}: EXPIRED. ` +
          `Please check in again at ${buildCheckinUrl()}`
        );
      } else {
        const expiresAtStr = session.expiresAt!.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        return twimlResponse(
          `Spot ${session.spot.label} (${session.vehicle.licensePlate}): ` +
          `${timeRemaining} min remaining (until ${expiresAtStr}). ` +
          `Reply EXTEND to add time.`
        );
      }
    }

    // Handle EXTEND command
    if (body.startsWith("EXTEND")) {
      if (!session) {
        return twimlResponse(
          "No active parking session found. " +
          "Visit " + buildCheckinUrl() + " to start parking."
        );
      }

      // Check if session is too expired to extend (more than 5 min grace)
      if (session.expiresAt && session.expiresAt.getTime() + 5 * 60 * 1000 < Date.now()) {
        return twimlResponse(
          "Your session has expired. " +
          "Please start a new check-in at " + buildCheckinUrl()
        );
      }

      // Parse hours from command (e.g., "EXTEND 2" or "EXTEND2")
      const hoursMatch = body.match(/EXTEND\s*(\d+)?/);
      const hours = hoursMatch?.[1] ? parseInt(hoursMatch[1], 10) : 1;
      const validHours = Math.min(Math.max(hours, 1), 12); // Clamp to 1-12

      // Create extension token and URL
      const token = await createExtensionToken(session.id);
      const extendUrl = buildExtendUrl(token);

      return twimlResponse(
        `Extend ${validHours} hour${validHours > 1 ? "s" : ""} for Spot ${session.spot.label}:\n` +
        extendUrl
      );
    }

    // Unknown command
    return twimlResponse(
      "Unknown command. Reply HELP for options, or STATUS to check your parking."
    );
  } catch (error: any) {
    console.error("Twilio webhook error:", error);
    return twimlResponse("Sorry, an error occurred. Please try again.");
  }
}

/**
 * Return TwiML response for Twilio
 */
function twimlResponse(message: string): NextResponse {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;

  return new NextResponse(twiml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
