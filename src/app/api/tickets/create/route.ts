import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { nextTicketCode } from "@/lib/tickets";
import { normalizePlate } from "@/lib/plates";

export async function POST(req: Request) {
  try {
    const { user } = await requireAdmin();

    const body = await req.json();
    const { spot, plate, amountCents, notes, officerId, reason } = body;

    if (!spot || !plate || !amountCents) {
      return NextResponse.json(
        { error: "Spot, plate, and fine amount are required" },
        { status: 400 }
      );
    }

    if (typeof amountCents !== "number" || amountCents < 100) {
      return NextResponse.json(
        { error: "Fine amount must be at least $1.00" },
        { status: 400 }
      );
    }

    const VALID_REASONS = ["failure_to_pay", "unauthorized_business_hours"];
    const normalizedReason = typeof reason === "string" && VALID_REASONS.includes(reason) ? reason : null;

    let citedByBadge: string | null = null;
    if (typeof officerId === "string" && officerId.trim()) {
      const officer = await prisma.officer.findUnique({ where: { id: officerId } });
      if (!officer) {
        return NextResponse.json({ error: "Selected officer not found" }, { status: 400 });
      }
      citedByBadge = officer.badgeNumber;
    }

    const normalizedPlate = normalizePlate(plate);
    const code = await nextTicketCode();

    const ticket = await prisma.ticket.create({
      data: {
        code,
        plate: normalizedPlate,
        spot: spot.trim().toUpperCase(),
        amountCents,
        notes: notes?.trim() || null,
        issuedBy: user.email,
        citedByBadge,
        reason: normalizedReason,
      },
    });

    return NextResponse.json({ ticket });
  } catch (err: any) {
    if (err.message === "unauthorized" || err.message === "forbidden") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("Create ticket error:", err);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 }
    );
  }
}
