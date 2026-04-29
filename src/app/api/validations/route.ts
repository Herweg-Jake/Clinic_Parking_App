import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SessionStatus } from "@prisma/client";
import { normalizePlate } from "@/lib/plates";

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * POST /api/validations
 * Apply a business validation code to extend (or grant) an active session.
 * Body: { code: string, plate: string, hours?: number }
 *
 * - Looks up the business by code (must be active).
 * - Finds the most recent active session for the plate and extends its expiry
 *   by `hours` (default 1). If no active session exists, the validation is
 *   recorded against the plate but no session is created (front desk can
 *   then run the patient through normal check-in).
 * - Always records a Validation row so monthly counts are accurate.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const codeInput = typeof body.code === "string" ? body.code : "";
    const plateInput = typeof body.plate === "string" ? body.plate : "";
    const hoursInput = typeof body.hours === "number" ? body.hours : 1;

    const code = normalizeCode(codeInput);
    if (!code) {
      return NextResponse.json({ error: "Validation code is required" }, { status: 400 });
    }
    if (!plateInput.trim()) {
      return NextResponse.json({ error: "License plate is required" }, { status: 400 });
    }
    const hours = Math.min(Math.max(Math.floor(hoursInput) || 1, 1), 12);
    const plate = normalizePlate(plateInput);

    const business = await prisma.business.findUnique({ where: { code } });
    if (!business || !business.isActive) {
      return NextResponse.json({ error: "Invalid validation code" }, { status: 404 });
    }

    // Find the most recent active session for this plate.
    const activeSession = await prisma.session.findFirst({
      where: {
        vehicle: { licensePlate: plate },
        status: { in: [SessionStatus.approved_pt, SessionStatus.paid] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { startedAt: "desc" },
      include: { spot: true },
    });

    let extendedTo: Date | null = null;
    if (activeSession) {
      const base = activeSession.expiresAt ?? new Date();
      extendedTo = new Date(base.getTime() + hours * 60 * 60 * 1000);
      await prisma.session.update({
        where: { id: activeSession.id },
        data: { expiresAt: extendedTo },
      });
    }

    const validation = await prisma.validation.create({
      data: {
        businessId: business.id,
        plate,
        spot: activeSession?.spot.label ?? null,
        sessionId: activeSession?.id ?? null,
        hours,
      },
    });

    return NextResponse.json({
      ok: true,
      business: { id: business.id, name: business.name },
      validation: { id: validation.id, hours: validation.hours },
      session: activeSession
        ? { id: activeSession.id, expiresAt: extendedTo?.toISOString() }
        : null,
      message: activeSession
        ? `Added ${hours} hour(s) to spot ${activeSession.spot.label}.`
        : `Validation recorded. No active session found for ${plate} — please complete check-in.`,
    });
  } catch (err) {
    console.error("Validation error:", err);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
