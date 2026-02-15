import Twilio from "twilio";

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// Check if Twilio is configured
export function isTwilioConfigured(): boolean {
  return Boolean(accountSid && authToken && fromNumber);
}

// Get Twilio client (lazy initialization)
function getTwilioClient() {
  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured");
  }
  return Twilio(accountSid, authToken);
}

export type SMSResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

/**
 * Send an SMS message via Twilio
 */
export async function sendSMS(to: string, body: string): Promise<SMSResult> {
  if (!isTwilioConfigured()) {
    console.warn("Twilio not configured, skipping SMS");
    return { success: false, error: "Twilio not configured" };
  }

  try {
    const client = getTwilioClient();
    const message = await client.messages.create({
      body,
      from: fromNumber,
      to,
    });

    console.log(`SMS sent to ${to}: ${message.sid}`);
    return { success: true, messageId: message.sid };
  } catch (error: any) {
    console.error("Failed to send SMS:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send parking expiration warning (10 minutes before expiry)
 */
export async function sendExpirationWarning(
  phone: string,
  spotLabel: string,
  expiresAt: Date,
  extendUrl: string
): Promise<SMSResult> {
  const expiresIn = Math.round((expiresAt.getTime() - Date.now()) / 60000);
  const timeStr = expiresAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Los_Angeles",
  });

  const message = `Nevada PT Parking: Your spot ${spotLabel} expires in ~${expiresIn} min (at ${timeStr}).

Extend your time: ${extendUrl}

Reply STOP to opt out.`;

  return sendSMS(phone, message);
}

/**
 * Send parking confirmation after payment
 */
export async function sendParkingConfirmation(
  phone: string,
  spotLabel: string,
  expiresAt: Date,
  statusUrl: string
): Promise<SMSResult> {
  const timeStr = expiresAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Los_Angeles",
  });

  const message = `Nevada PT Parking: Spot ${spotLabel} confirmed until ${timeStr}.

Check status: ${statusUrl}

We'll text you 10 min before expiration.`;

  return sendSMS(phone, message);
}

/**
 * Send parking expired notification
 */
export async function sendExpiredNotification(
  phone: string,
  spotLabel: string,
  checkinUrl: string
): Promise<SMSResult> {
  const message = `Nevada PT Parking: Your time at spot ${spotLabel} has expired.

If you're still parked, please check in again: ${checkinUrl}`;

  return sendSMS(phone, message);
}

/**
 * Send extension confirmation
 */
export async function sendExtensionConfirmation(
  phone: string,
  spotLabel: string,
  newExpiresAt: Date,
  statusUrl: string
): Promise<SMSResult> {
  const timeStr = newExpiresAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const message = `Nevada PT Parking: Spot ${spotLabel} extended until ${timeStr}.

Check status: ${statusUrl}

We'll text you 10 min before expiration.`;

  return sendSMS(phone, message);
}
