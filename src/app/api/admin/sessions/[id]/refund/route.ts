import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { SessionStatus } from "@prisma/client";

/**
 * POST /api/admin/sessions/:id/refund
 * Refunds the Stripe payment associated with a session.
 * Body (optional): { reason?: string, voidSession?: boolean }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAdmin();
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const reason: string | undefined =
      typeof body?.reason === "string" && body.reason.trim() ? body.reason.trim() : undefined;
    const voidSession: boolean = body?.voidSession !== false; // default true

    const session = await prisma.session.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (!session.payment) {
      return NextResponse.json(
        { error: "This session has no payment to refund" },
        { status: 400 }
      );
    }
    if (session.payment.status === "refunded") {
      return NextResponse.json(
        { error: "Payment has already been refunded" },
        { status: 400 }
      );
    }
    if (session.payment.status !== "paid") {
      return NextResponse.json(
        { error: `Cannot refund payment in status "${session.payment.status}"` },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured on the server" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Look up the underlying payment intent on the checkout session.
    const checkout = await stripe.checkout.sessions.retrieve(
      session.payment.stripeCheckoutSessionId
    );
    const paymentIntentId =
      typeof checkout.payment_intent === "string"
        ? checkout.payment_intent
        : checkout.payment_intent?.id;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "No payment intent found for this checkout" },
        { status: 400 }
      );
    }

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: "requested_by_customer",
      metadata: {
        sessionId: session.id,
        refundedBy: user.email,
        ...(reason ? { note: reason.slice(0, 480) } : {}),
      },
    });

    const noteSuffix = `Refunded by ${user.email} at ${new Date().toISOString()}${
      reason ? ` — ${reason}` : ""
    }`;

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: session.payment.id },
        data: { status: "refunded" },
      }),
      prisma.session.update({
        where: { id: session.id },
        data: {
          ...(voidSession ? { status: SessionStatus.void } : {}),
          notes: session.notes ? `${session.notes}\n${noteSuffix}` : noteSuffix,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      refundId: refund.id,
      amountRefunded: refund.amount,
      paymentIntentId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Refund failed";
    if (msg === "unauthorized" || msg === "forbidden") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("Refund error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
