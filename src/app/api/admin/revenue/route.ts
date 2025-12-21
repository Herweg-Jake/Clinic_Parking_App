import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/revenue
 * Returns revenue statistics including total revenue, today's revenue, and payment count.
 */
export async function GET() {
  try {
    await requireAdmin();

    // Get all paid payments
    const paidPayments = await prisma.payment.findMany({
      where: {
        status: "paid",
      },
      select: {
        amountCents: true,
        paidAt: true,
      },
    });

    type PaymentRecord = { amountCents: number; paidAt: Date | null };

    // Calculate total revenue
    const totalRevenue = paidPayments.reduce((sum: number, payment: PaymentRecord) => sum + payment.amountCents, 0);

    // Calculate today's revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRevenue = paidPayments
      .filter((p: PaymentRecord) => p.paidAt && new Date(p.paidAt) >= today)
      .reduce((sum: number, payment: PaymentRecord) => sum + payment.amountCents, 0);

    // Calculate this month's revenue
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthRevenue = paidPayments
      .filter((p: PaymentRecord) => p.paidAt && new Date(p.paidAt) >= startOfMonth)
      .reduce((sum: number, payment: PaymentRecord) => sum + payment.amountCents, 0);

    return NextResponse.json({
      totalRevenue: totalRevenue / 100, // Convert to dollars
      todayRevenue: todayRevenue / 100,
      monthRevenue: monthRevenue / 100,
      totalTransactions: paidPayments.length,
    });
  } catch (e: any) {
    const msg = e?.message || "Unauthorized";
    const code = msg === "forbidden" || msg === "unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
