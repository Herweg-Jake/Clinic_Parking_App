import { z } from "zod";

export const checkinSchema = z.object({
  plate: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")).optional(),
  phone: z.string().optional().or(z.literal("")).optional(),
  spotLabel: z.string().min(1),
  isVisitor: z.boolean(),
});

export type CheckinInput = z.infer<typeof checkinSchema>;
