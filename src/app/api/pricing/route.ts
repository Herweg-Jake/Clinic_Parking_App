import { NextResponse } from "next/server";
import { getParkingConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getParkingConfig();

    return NextResponse.json({
      rateCents: config.currentRateCents,
      rateDisplay: (config.currentRateCents / 100).toFixed(0),
      isWeekend: config.isWeekend,
      weekdayRate: config.rateCents,
      weekendRate: config.rateCentsWeekend,
    });
  } catch (err: any) {
    console.error("Pricing error:", err);
    return NextResponse.json({ error: "Failed to get pricing" }, { status: 500 });
  }
}
