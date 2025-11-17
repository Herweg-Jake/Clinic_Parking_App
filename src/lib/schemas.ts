import { z } from "zod";

export const checkinSchema = z.object({
  plate: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")).optional(),
  phone: z.string().optional().or(z.literal("")).optional(),
  spotLabel: z.string().min(1),
  parkingType: z.enum(["visitor", "nevada_pt"]),
  nevadaPtCode: z.string().optional(),
});

export type CheckinInput = z.infer<typeof checkinSchema>;
