import Stripe from "stripe";
import { prisma } from "./prisma";
import { SessionStatus } from "@prisma/client";
import { getParkingConfig } from "./config";

export type ReconcileResult = {
  scanned: number;
  alreadyOk: number;
  created: number;
  skipped: number;
  errors: { checkoutId: string; error: string }[];
  createdSessions: { checkoutId: string; sessionId: string; plate: string; spotLabel: string }[];
};

/**
 * Reconcile a single completed Stripe checkout session against our DB.
 * Mirrors the webhook handler so we can recover from missed webhook deliveries.
 *
 * Returns one of:
 *  - "already_ok": a session already exists for this checkout
 *  - "created":    we created the missing session
 *  - "skipped":    not eligible (wrong type / missing metadata / already-paid spot)
 */
export async function reconcileCheckout(
  cs: Stripe.Checkout.Session
): Promise<{ status: "already_ok" | "created" | "skipped"; sessionId?: string; plate?: string; spotLabel?: string; reason?: string }> {
  if (cs.payment_status !== "paid") {
    return { status: "skipped", reason: "checkout not paid" };
  }

  const paymentType = cs.metadata?.type;

  // Only handle the "new parking payment" case here.
  // Extension payments and ticket payments only mutate existing rows; if the
  // webhook missed those, the customer can re-trigger from their existing
  // session/ticket. We don't try to backfill those flows.
  if (paymentType === "extension" || paymentType === "ticket_payment") {
    // Still ensure Payment row is marked paid.
    await prisma.payment.updateMany({
      where: { stripeCheckoutSessionId: cs.id },
      data: { status: "paid", paidAt: new Date(cs.created * 1000) },
    });
    return { status: "skipped", reason: `payment type "${paymentType}" — not a parking session` };
  }

  const plate = String(cs.metadata?.plate || "").trim();
  const spotLabel = String(cs.metadata?.spotLabel || "").trim();
  if (!plate || !spotLabel) {
    return { status: "skipped", reason: "checkout missing plate/spotLabel metadata" };
  }

  // Idempotency: if a session is already linked to a payment for this checkout, we're done.
  const existing = await prisma.session.findFirst({
    where: { payment: { stripeCheckoutSessionId: cs.id } },
  });
  if (existing) {
    // Make sure Payment row is in sync.
    await prisma.payment.updateMany({
      where: { stripeCheckoutSessionId: cs.id, status: { not: "paid" } },
      data: { status: "paid", paidAt: new Date(cs.created * 1000) },
    });
    return { status: "already_ok", sessionId: existing.id, plate, spotLabel };
  }

  const spot = await prisma.spot.findUnique({ where: { label: spotLabel } });
  if (!spot) {
    return { status: "skipped", reason: `spot ${spotLabel} not found` };
  }

  const phone = cs.metadata?.phone || null;
  const email = cs.metadata?.email || null;
  const customDurationMinutes = cs.metadata?.durationMinutes
    ? Number(cs.metadata.durationMinutes)
    : null;

  const vehicle = await prisma.vehicle.upsert({
    where: { licensePlate: plate },
    update: {
      ownerEmail: email || undefined,
      ownerPhone: phone || undefined,
    },
    create: {
      licensePlate: plate,
      ownerEmail: email,
      ownerPhone: phone,
    },
  });

  // Close other active sessions for this vehicle/spot.
  await prisma.session.updateMany({
    where: {
      vehicleId: vehicle.id,
      status: { in: [SessionStatus.approved_pt, SessionStatus.paid] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    data: { status: SessionStatus.void, notes: "superseded by reconciled paid session" },
  });
  await prisma.session.updateMany({
    where: {
      spotId: spot.id,
      status: { in: [SessionStatus.approved_pt, SessionStatus.paid] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    data: { status: SessionStatus.void, notes: "spot taken by reconciled paid session" },
  });

  const durationMinutes = customDurationMinutes || (await getParkingConfig()).durationMinutes;
  // Compute expiresAt from the original checkout creation time, not now —
  // otherwise reconciling old payments would extend their parking incorrectly.
  const startedAt = new Date(cs.created * 1000);
  const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

  // Ensure the Payment row exists and is marked paid; capture its id.
  const amountCents = cs.amount_total ?? 0;
  const payment = await prisma.payment.upsert({
    where: { stripeCheckoutSessionId: cs.id },
    update: { status: "paid", paidAt: startedAt, amountCents },
    create: {
      stripeCheckoutSessionId: cs.id,
      amountCents,
      status: "paid",
      paidAt: startedAt,
    },
  });

  const newSession = await prisma.session.create({
    data: {
      vehicleId: vehicle.id,
      spotId: spot.id,
      status: SessionStatus.paid,
      source: "visitor_payment",
      startedAt,
      expiresAt,
      phoneNumber: phone,
      paymentId: payment.id,
      notes: "Reconciled from Stripe (webhook missed)",
    },
  });

  return { status: "created", sessionId: newSession.id, plate, spotLabel };
}

/**
 * Scan recent Stripe checkout sessions and reconcile any that are paid but
 * missing a corresponding DB Session.
 */
export async function reconcileRecentCheckouts(
  stripe: Stripe,
  options: { sinceUnix?: number; limit?: number } = {}
): Promise<ReconcileResult> {
  const { sinceUnix, limit = 100 } = options;

  const result: ReconcileResult = {
    scanned: 0,
    alreadyOk: 0,
    created: 0,
    skipped: 0,
    errors: [],
    createdSessions: [],
  };

  const list = await stripe.checkout.sessions.list({
    limit: Math.min(limit, 100),
    ...(sinceUnix ? { created: { gte: sinceUnix } } : {}),
  });

  for (const cs of list.data) {
    result.scanned += 1;
    try {
      const r = await reconcileCheckout(cs);
      if (r.status === "already_ok") result.alreadyOk += 1;
      else if (r.status === "created") {
        result.created += 1;
        result.createdSessions.push({
          checkoutId: cs.id,
          sessionId: r.sessionId!,
          plate: r.plate!,
          spotLabel: r.spotLabel!,
        });
      } else result.skipped += 1;
    } catch (err) {
      result.errors.push({
        checkoutId: cs.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
