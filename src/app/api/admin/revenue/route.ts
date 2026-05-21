import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Bucket = { total: number; today: number; month: number; transactions: number };

function summarize(records: { amountCents: number; paidAt: Date | null }[]): Bucket {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  let total = 0;
  let todaySum = 0;
  let monthSum = 0;
  for (const r of records) {
    total += r.amountCents;
    if (r.paidAt) {
      const d = new Date(r.paidAt);
      if (d >= today) todaySum += r.amountCents;
      if (d >= startOfMonth) monthSum += r.amountCents;
    }
  }
  return {
    total: total / 100,
    today: todaySum / 100,
    month: monthSum / 100,
    transactions: records.length,
  };
}

/**
 * GET /api/admin/revenue
 * Returns parking, ticket, and combined revenue stats.
 */
export async function GET() {
  try {
    await requireAdmin();

    const [paidPayments, paidTickets] = await Promise.all([
      prisma.payment.findMany({
        where: { status: "paid" },
        select: { amountCents: true, paidAt: true },
      }),
      prisma.ticket.findMany({
        where: { paidAt: { not: null } },
        select: { amountCents: true, paidAt: true },
      }),
    ]);

    const parking = summarize(paidPayments);
    const tickets = summarize(paidTickets);
    const combined: Bucket = {
      total: parking.total + tickets.total,
      today: parking.today + tickets.today,
      month: parking.month + tickets.month,
      transactions: parking.transactions + tickets.transactions,
    };

    return NextResponse.json({ parking, tickets, combined });
  } catch (e: any) {
    const msg = e?.message || "Unauthorized";
    const code = msg === "forbidden" || msg === "unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
