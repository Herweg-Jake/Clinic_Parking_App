import { prisma } from "./prisma";

export type ParkingConfig = {
  rateCents: number;
  durationMinutes: number;
  graceMinutes: number;
};

export async function getParkingConfig(): Promise<ParkingConfig> {
  const rows = await prisma.config.findMany({
    where: { key: { in: ["rate_cents", "duration_minutes", "grace_minutes"] } },
  });
  const map = new Map(rows.map(r => [r.key, r.value]));
  return {
    rateCents: Number(map.get("rate_cents") ?? 500),
    durationMinutes: Number(map.get("duration_minutes") ?? 120),
    graceMinutes: Number(map.get("grace_minutes") ?? 10),
  };
}
