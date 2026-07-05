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

    // Compute per-plate totals across ALL tickets (not just the filtered set) so
    // we can flag repeat offenders with an outstanding unpaid ticket — these are
    // tow candidates rather than re-ticket candidates.
    const plates = [...new Set(tickets.map((t) => t.plate))];
    const [totalByPlate, unpaidByPlate] = plates.length
      ? await Promise.all([
          prisma.ticket.groupBy({
            by: ["plate"],
            where: { plate: { in: plates } },
            _count: { _all: true },
          }),
          prisma.ticket.groupBy({
            by: ["plate"],
            where: { plate: { in: plates }, paidAt: null },
            _count: { _all: true },
          }),
        ])
      : [[], []];

    const totalMap = new Map(totalByPlate.map((g) => [g.plate, g._count._all]));
    const unpaidMap = new Map(unpaidByPlate.map((g) => [g.plate, g._count._all]));

    // A ticket is flagged when its plate has 2+ tickets and 1+ unpaid.
    const flaggedTickets = tickets.map((t) => {
      const unpaid = unpaidMap.get(t.plate) ?? 0;
      const total = totalMap.get(t.plate) ?? 0;
      return { ...t, flagged: total >= 2 && unpaid >= 1 };
    });

    // Also return summary stats (computed across ALL tickets, ignoring filters)
    const [totalIssued, totalUnpaid, paidTickets, totalPlateGroups, unpaidPlateGroups] =
      await Promise.all([
        prisma.ticket.count(),
        prisma.ticket.count({ where: { paidAt: null } }),
        prisma.ticket.findMany({
          where: { paidAt: { not: null } },
          select: { amountCents: true },
        }),
        prisma.ticket.groupBy({ by: ["plate"], _count: { _all: true } }),
        prisma.ticket.groupBy({
          by: ["plate"],
          where: { paidAt: null },
          _count: { _all: true },
        }),
      ]);

    const totalCollectedCents = paidTickets.reduce(
      (sum, t) => sum + t.amountCents,
      0
    );

    // Tow candidates: distinct plates with 2+ tickets AND at least one unpaid.
    const unpaidPlateSet = new Set(unpaidPlateGroups.map((g) => g.plate));
    const towCandidates = totalPlateGroups.filter(
      (g) => g._count._all >= 2 && unpaidPlateSet.has(g.plate)
    ).length;

    return NextResponse.json({
      tickets: flaggedTickets,
      stats: {
        totalIssued,
        totalUnpaid,
        totalCollectedCents,
        towCandidates,
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
