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

    // Compute per-plate totals for the plates in this result set so we can flag
    // repeat offenders with an outstanding unpaid ticket — these are tow
    // candidates rather than re-ticket candidates. A single groupBy counts both
    // total tickets (_all) and paid tickets (paidAt is non-null); unpaid is the
    // difference. Scoped to the visible plates, so it uses the plate index.
    const plates = [...new Set(tickets.map((t) => t.plate))];
    const plateStats = plates.length
      ? await prisma.ticket.groupBy({
          by: ["plate"],
          where: { plate: { in: plates } },
          _count: { _all: true, paidAt: true },
        })
      : [];

    const statMap = new Map(plateStats.map((g) => [g.plate, g._count]));

    // A ticket is flagged when its plate has 2+ tickets and 1+ unpaid.
    const flaggedTickets = tickets.map((t) => {
      const c = statMap.get(t.plate);
      const total = c?._all ?? 0;
      const unpaid = total - (c?.paidAt ?? 0);
      return { ...t, flagged: total >= 2 && unpaid >= 1 };
    });

    // Summary stats across ALL tickets (ignoring filters). A single per-plate
    // groupBy backs the tow-candidate count, and an aggregate sum avoids loading
    // every paid ticket into memory.
    const [totalIssued, totalUnpaid, collected, allPlateStats] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { paidAt: null } }),
      prisma.ticket.aggregate({
        _sum: { amountCents: true },
        where: { paidAt: { not: null } },
      }),
      prisma.ticket.groupBy({ by: ["plate"], _count: { _all: true, paidAt: true } }),
    ]);

    const totalCollectedCents = collected._sum.amountCents ?? 0;

    // Tow candidates: distinct plates with 2+ tickets AND at least one unpaid.
    const towCandidates = allPlateStats.filter(
      (g) => g._count._all >= 2 && g._count._all - g._count.paidAt >= 1
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
