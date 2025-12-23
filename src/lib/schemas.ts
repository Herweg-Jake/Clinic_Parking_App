import { z } from "zod";

// License plate: 2-8 alphanumeric characters only
const plateRegex = /^[A-Z0-9]{2,8}$/;

// Phone: digits, dashes, parentheses, spaces only
const phoneRegex = /^[0-9\-\(\)\s]+$/;

// Phone must have at least 10 digits for US numbers
const phoneDigitsRegex = /^[\d\-\(\)\s]+$/;

// Nevada PT code: alphanumeric only
const codeRegex = /^[A-Z0-9]+$/;

// Helper to extract digits from phone number
export function extractPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

// Helper to format phone to E.164 (for Twilio)
export function formatPhoneE164(phone: string): string {
  const digits = extractPhoneDigits(phone);
  // Assume US number if 10 digits, add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  // If 11 digits starting with 1, format as +1XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  // Otherwise return as-is with + prefix
  return `+${digits}`;
}

export const checkinSchema = z.object({
  plate: z.string()
    .min(2, "License plate must be at least 2 characters")
    .max(8, "License plate must be at most 8 characters")
    .regex(plateRegex, "License plate must contain only letters and numbers")
    .transform(val => val.toUpperCase()),
  email: z.string()
    .email("Invalid email format")
    .max(100, "Email too long")
    .optional()
    .or(z.literal(""))
    .optional(),
  phone: z.string()
    .max(20, "Phone number too long")
    .optional()
    .or(z.literal(""))
    .optional(),
  spotLabel: z.string()
    .min(1, "Parking spot is required")
    .max(10, "Invalid spot label"),
  parkingType: z.enum(["visitor", "nevada_pt"]),
  nevadaPtCode: z.string()
    .max(20, "Code too long")
    .refine(val => !val || codeRegex.test(val), "Code must contain only letters and numbers")
    .optional()
    .or(z.literal(""))
    .optional(),
  hours: z.number()
    .min(1, "Must select at least 1 hour")
    .max(12, "Maximum 12 hours")
    .optional(), // 1-12 hours for visitors
}).refine(
  (data) => {
    // Phone is required for visitors
    if (data.parkingType === "visitor") {
      if (!data.phone || data.phone.trim() === "") {
        return false;
      }
      // Must have at least 10 digits
      const digits = extractPhoneDigits(data.phone);
      return digits.length >= 10;
    }
    return true;
  },
  {
    message: "Phone number is required for paid parking (minimum 10 digits)",
    path: ["phone"],
  }
);

export type CheckinInput = z.infer<typeof checkinSchema>;
