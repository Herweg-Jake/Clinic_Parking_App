import { prisma } from "./prisma";

export type ParkingConfig = {
  rateCents: number;
  rateCentsWeekend: number;
  durationMinutes: number;
  graceMinutes: number;
  isWeekend: boolean;
  currentRateCents: number; // The rate to use based on current day
};

// Weekend days: Friday (5), Saturday (6), Sunday (0)
const WEEKEND_DAYS = [0, 5, 6];

export function isWeekendDay(date: Date = new Date()): boolean {
  return WEEKEND_DAYS.includes(date.getDay());
}

export async function getParkingConfig(): Promise<ParkingConfig> {
  const rows = await prisma.config.findMany({
    where: { key: { in: ["rate_cents", "rate_cents_weekend", "duration_minutes", "grace_minutes"] } },
  });
  const map = new Map(rows.map((r: { key: string; value: string }) => [r.key, r.value]));

  const rateCents = Number(map.get("rate_cents") ?? 200); // $2.00 weekday default
  const rateCentsWeekend = Number(map.get("rate_cents_weekend") ?? 500); // $5.00 weekend default
  const isWeekend = isWeekendDay();

  return {
    rateCents,
    rateCentsWeekend,
    durationMinutes: Number(map.get("duration_minutes") ?? 60),
    graceMinutes: Number(map.get("grace_minutes") ?? 10),
    isWeekend,
    currentRateCents: isWeekend ? rateCentsWeekend : rateCents,
  };
}
