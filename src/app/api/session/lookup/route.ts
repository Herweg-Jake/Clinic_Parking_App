import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SessionStatus } from "@prisma/client";
import { formatPhoneE164 } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session");
  const plate = searchParams.get("plate");
  const phone = searchParams.get("phone");

  try {
    let session = null;

    if (sessionId) {
      // Look up by session ID
      session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          spot: true,
          vehicle: true,
        },
      });
    } else if (plate) {
      // Look up by license plate - find most recent active session
      const normalized = plate.toUpperCase().replace(/\s/g, "");
      session = await prisma.session.findFirst({
        where: {
          vehicle: { licensePlate: normalized },
          status: { in: [SessionStatus.approved_pt, SessionStatus.paid] },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } }, // Include recently expired (1 hour)
          ],
        },
        include: {
          spot: true,
          vehicle: true,
        },
        orderBy: { startedAt: "desc" },
      });
    } else if (phone) {
      // Look up by phone number
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10) {
        return NextResponse.json(
          { error: "Invalid phone number" },
          { status: 400 }
        );
      }

      // Try different phone formats
      const phoneFormats = [
        formatPhoneE164(phone),
        `+1${digits.slice(-10)}`,
        digits.slice(-10),
      ];

      session = await prisma.session.findFirst({
        where: {
          phoneNumber: { in: phoneFormats },
          status: { in: [SessionStatus.approved_pt, SessionStatus.paid] },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
          ],
        },
        include: {
          spot: true,
          vehicle: true,
        },
        orderBy: { startedAt: "desc" },
      });
    } else {
      return NextResponse.json(
        { error: "Session ID, license plate, or phone number required" },
        { status: 400 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: "No active parking session found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: session.id,
      spotLabel: session.spot.label,
      licensePlate: session.vehicle.licensePlate,
      expiresAt: session.expiresAt?.toISOString() || null,
      status: session.status,
    });
  } catch (error: any) {
    console.error("Session lookup error:", error);
    return NextResponse.json(
      { error: "Failed to look up session" },
      { status: 500 }
    );
  }
}
