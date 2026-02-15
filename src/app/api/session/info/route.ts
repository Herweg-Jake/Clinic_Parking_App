import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateExtensionToken } from "@/lib/tokens";
import { getParkingConfig } from "@/lib/config";
import { SessionStatus } from "@prisma/client";
import { triggerNotificationCheck } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Trigger notification check in background (on-demand for Hobby plan)
  triggerNotificationCheck();
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const sessionId = searchParams.get("session");

  try {
    let targetSessionId: string | null = null;

    // Get session ID from token or direct session ID
    if (token) {
      targetSessionId = await validateExtensionToken(token);
      if (!targetSessionId) {
        return NextResponse.json(
          { error: "Invalid or expired extension link" },
          { status: 400 }
        );
      }
    } else if (sessionId) {
      targetSessionId = sessionId;
    } else {
      return NextResponse.json(
        { error: "Token or session ID required" },
        { status: 400 }
      );
    }

    // Get session with spot and vehicle info
    const session = await prisma.session.findUnique({
      where: { id: targetSessionId },
      include: {
        spot: true,
        vehicle: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Check if session is still active
    if (session.status !== SessionStatus.paid && session.status !== SessionStatus.approved_pt) {
      return NextResponse.json(
        { error: "Session is no longer active" },
        { status: 400 }
      );
    }

    // Get current pricing
    const config = await getParkingConfig();

    return NextResponse.json({
      id: session.id,
      spotLabel: session.spot.label,
      licensePlate: session.vehicle.licensePlate,
      expiresAt: session.expiresAt?.toISOString() || null,
      status: session.status,
      currentRateCents: config.currentRateCents,
      isWeekend: config.isWeekend,
    });
  } catch (error: any) {
    console.error("Session info error:", error);
    return NextResponse.json(
      { error: "Failed to get session info" },
      { status: 500 }
    );
  }
}
