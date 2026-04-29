import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAdmin } from "@/lib/auth";
import { reconcileRecentCheckouts } from "@/lib/stripe-sync";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/reconcile-stripe
 * Pulls recent Stripe checkout sessions and creates any missing DB Sessions
 * (recovers from missed webhook deliveries).
 *
 * Body (optional): { days?: number, limit?: number }
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const days = Math.min(Math.max(Number(body?.days) || 7, 1), 30);
    const limit = Math.min(Math.max(Number(body?.limit) || 100, 1), 100);

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sinceUnix = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;

    const result = await reconcileRecentCheckouts(stripe, { sinceUnix, limit });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Reconcile failed";
    if (msg === "unauthorized" || msg === "forbidden") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("Reconcile error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
