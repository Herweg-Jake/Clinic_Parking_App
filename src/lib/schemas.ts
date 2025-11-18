import { z } from "zod";

// License plate: 2-8 alphanumeric characters only
const plateRegex = /^[A-Z0-9]{2,8}$/;

// Phone: digits, dashes, parentheses, spaces only (optional field)
const phoneRegex = /^[0-9\-\(\)\s]*$/;

// Nevada PT code: alphanumeric only
const codeRegex = /^[A-Z0-9]+$/;

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
    .regex(phoneRegex, "Phone number contains invalid characters")
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
});

export type CheckinInput = z.infer<typeof checkinSchema>;
