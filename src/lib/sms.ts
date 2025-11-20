import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  if (!accountSid || !authToken || !twilioPhoneNumber) {
    console.warn('Twilio credentials not configured. SMS notifications will be disabled.');
    return null;
  }

  if (!twilioClient) {
    twilioClient = twilio(accountSid, authToken);
  }

  return twilioClient;
}

export interface SendSMSParams {
  to: string;
  message: string;
}

export async function sendSMS({ to, message }: SendSMSParams): Promise<boolean> {
  const client = getTwilioClient();

  if (!client || !twilioPhoneNumber) {
    console.warn('SMS not sent - Twilio not configured');
    return false;
  }

  try {
    // Normalize phone number - ensure it starts with +1 if it's a US number without country code
    let normalizedPhone = to.replace(/[\s\-\(\)]/g, '');
    if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+1' + normalizedPhone;
    }

    await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: normalizedPhone,
    });

    console.log(`SMS sent successfully to ${normalizedPhone}`);
    return true;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return false;
  }
}

export function formatExpirationMessage(spotName: string, minutesRemaining: number, extensionUrl?: string): string {
  let message = `Clinic Parking Alert: Your parking spot ${spotName} will expire in ${minutesRemaining} minutes.`;

  if (extensionUrl) {
    message += `\n\nExtend your parking time: ${extensionUrl}`;
  }

  return message;
}
