import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { normalizePlate } from "@/lib/plates";

export const dynamic = "force-dynamic";

/**
 * GET /api/tickets/check-plate?plate=ABC1234
 *
 * Returns the prior ticket history for a plate so staff can decide whether to
 * issue another ticket or tow. `shouldTow` is true when the vehicle already has
 * an unpaid ticket on file — i.e. this would be a repeat offense.
 */
export async function GET(req: Request) {
  try {
    await requireAdmin();

    const url = new URL(req.url);
    const raw = url.searchParams.get("plate")?.trim();
    if (!raw) {
      return NextResponse.json({ error: "Plate is required" }, { status: 400 });
    }

    const plate = normalizePlate(raw);

    const [priorTicketCount, priorUnpaidCount] = await Promise.all([
      prisma.ticket.count({ where: { plate } }),
      prisma.ticket.count({ where: { plate, paidAt: null } }),
    ]);

    return NextResponse.json({
      plate,
      priorTicketCount,
      priorUnpaidCount,
      // Flag: already has at least one unpaid ticket → tow instead of ticketing.
      shouldTow: priorUnpaidCount > 0,
    });
  } catch (err: any) {
    if (err.message === "unauthorized" || err.message === "forbidden") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("Check plate error:", err);
    return NextResponse.json({ error: "Failed to check plate" }, { status: 500 });
  }
}
