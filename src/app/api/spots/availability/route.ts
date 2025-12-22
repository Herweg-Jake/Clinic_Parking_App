import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SessionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get total active spots
    const totalSpots = await prisma.spot.count({
      where: { isActive: true },
    });

    // Get count of occupied spots (active sessions)
    const occupiedSpots = await prisma.session.count({
      where: {
        status: { in: [SessionStatus.approved_pt, SessionStatus.paid] },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
        spot: { isActive: true },
      },
    });

    const availableSpots = totalSpots - occupiedSpots;

    return NextResponse.json({
      total: totalSpots,
      available: availableSpots,
      occupied: occupiedSpots,
    });
  } catch (error: any) {
    console.error("Spot availability error:", error);
    return NextResponse.json(
      { error: "Failed to get spot availability" },
      { status: 500 }
    );
  }
}
