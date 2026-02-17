import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const url = new URL(req.url);
    const plate = url.searchParams.get("plate")?.trim().toUpperCase();
    const status = url.searchParams.get("status"); // "paid" | "unpaid"

    const where: Record<string, unknown> = {};

    if (plate) {
      where.plate = { contains: plate };
    }

    if (status === "paid") {
      where.paidAt = { not: null };
    } else if (status === "unpaid") {
      where.paidAt = null;
    }

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { issuedAt: "desc" },
    });

    // Also return summary stats
    const [totalIssued, totalUnpaid, paidTickets] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { paidAt: null } }),
      prisma.ticket.findMany({
        where: { paidAt: { not: null } },
        select: { amountCents: true },
      }),
    ]);

    const totalCollectedCents = paidTickets.reduce(
      (sum, t) => sum + t.amountCents,
      0
    );

    return NextResponse.json({
      tickets,
      stats: {
        totalIssued,
        totalUnpaid,
        totalCollectedCents,
      },
    });
  } catch (err: any) {
    if (err.message === "unauthorized" || err.message === "forbidden") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("List tickets error:", err);
    return NextResponse.json(
      { error: "Failed to list tickets" },
      { status: 500 }
    );
  }
}
