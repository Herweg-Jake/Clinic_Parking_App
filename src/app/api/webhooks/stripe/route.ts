import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getParkingConfig } from "@/lib/config";
import { SessionStatus } from "@prisma/client";
import { markTokenUsed } from "@/lib/tokens";
import { sendParkingConfirmation, sendExtensionConfirmation, isTwilioConfigured } from "@/lib/sms";
import { buildStatusUrl } from "@/lib/tokens";

export const dynamic = "force-dynamic"; // ensure it runs as a serverless fn

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

  const rawBody = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig!, secret);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle abandoned or failed checkouts — clean up stale "initiated" payment records
  if (
    event.type === "checkout.session.expired" ||
    event.type === "checkout.session.async_payment_failed"
  ) {
    const cs = event.data.object as Stripe.Checkout.Session;
    await prisma.payment.updateMany({
      where: { stripeCheckoutSessionId: cs.id, status: "initiated" },
      data: { status: "failed" },
    });
    console.log(`[Stripe Webhook] Marked payment as failed for ${event.type}:`, cs.id);
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.completed") {
    const cs = event.data.object as Stripe.Checkout.Session;

    // 1) mark payment paid (idempotent)
    await prisma.payment.updateMany({
      where: { stripeCheckoutSessionId: cs.id },
      data: { status: "paid", paidAt: new Date() },
    });

    // Check if this is an extension payment
    const paymentType = cs.metadata?.type;

    if (paymentType === "ticket_payment") {
      // Handle parking ticket payment
      const ticketId = cs.metadata?.ticketId;
      const ticketCode = cs.metadata?.ticketCode;

      if (ticketId) {
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { paidAt: new Date() },
        });
        console.log(`[Stripe Webhook] Ticket ${ticketCode} marked as paid`);
      }
    } else if (paymentType === "extension") {
      // Handle extension payment
      const sessionId = cs.metadata?.sessionId;
      const extensionToken = cs.metadata?.extensionToken;
      const durationMinutes = cs.metadata?.durationMinutes ? Number(cs.metadata.durationMinutes) : 60;
      const phone = cs.metadata?.phone || null;
      const spotLabel = cs.metadata?.spotLabel || "";

      if (sessionId) {
        const session = await prisma.session.findUnique({
          where: { id: sessionId },
        });

        if (session && session.status === SessionStatus.paid) {
          // Calculate new expiration (from current expiration or now, whichever is later)
          const baseTime = session.expiresAt && session.expiresAt > new Date()
            ? session.expiresAt
            : new Date();
          const newExpiresAt = new Date(baseTime.getTime() + durationMinutes * 60 * 1000);

          // Update session expiration and reset notification flag
          await prisma.session.update({
            where: { id: sessionId },
            data: {
              expiresAt: newExpiresAt,
              notificationSentAt: null, // Reset so they get another warning
            },
          });

          // Mark token as used
          if (extensionToken) {
            await markTokenUsed(extensionToken).catch(() => {});
          }

          // Send confirmation SMS
          if (phone && isTwilioConfigured()) {
            const statusUrl = buildStatusUrl(sessionId);
            sendExtensionConfirmation(phone, spotLabel, newExpiresAt, statusUrl).catch(
              (err) => console.error("Failed to send extension confirmation:", err)
            );
          }
        }
      }
    } else {
      // Handle new parking payment
      const plate = String(cs.metadata?.plate || "");
      const spotLabel = String(cs.metadata?.spotLabel || "");
      const customDurationMinutes = cs.metadata?.durationMinutes ? Number(cs.metadata.durationMinutes) : null;
      const phone = cs.metadata?.phone || null;

      console.log("[Stripe Webhook] Processing new parking payment:", {
        checkoutSessionId: cs.id,
        plate,
        spotLabel,
        durationMinutes: customDurationMinutes,
        phone: phone ? "provided" : "none"
      });

      if (!plate || !spotLabel) {
        console.error("[Stripe Webhook] Missing metadata:", { plate, spotLabel });
        return NextResponse.json({ received: true, error: "Missing metadata" });
      }

      // Idempotency guard: check if a session was already created for this checkout
      const existingSession = await prisma.session.findFirst({
        where: {
          payment: { stripeCheckoutSessionId: cs.id },
        },
      });
      if (existingSession) {
        console.log("[Stripe Webhook] Session already exists for checkout, skipping:", cs.id);
        return NextResponse.json({ received: true });
      }

      // Look up spot and vehicle - use upsert to avoid unique constraint race condition
      const [spot, vehicle] = await Promise.all([
        prisma.spot.findUnique({ where: { label: spotLabel } }),
        prisma.vehicle.upsert({
          where: { licensePlate: plate },
          update: {
            ownerEmail: cs.metadata?.email || undefined,
            ownerPhone: phone || undefined,
          },
          create: {
            licensePlate: plate,
            ownerEmail: cs.metadata?.email || null,
            ownerPhone: phone,
          },
        }),
      ]);

      if (!spot) {
        console.error("[Stripe Webhook] Spot not found:", spotLabel);
        return NextResponse.json({ received: true, error: "Spot not found" });
      }

      console.log("[Stripe Webhook] Found/created records:", {
        spotId: spot.id,
        vehicleId: vehicle.id
      });

      const durationMinutes = customDurationMinutes || (await getParkingConfig()).durationMinutes;
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

      // Close previous active sessions for this VEHICLE
      await prisma.session.updateMany({
        where: {
          vehicleId: vehicle.id,
          status: { in: [SessionStatus.approved_pt, SessionStatus.paid] },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        data: { status: SessionStatus.void, notes: "superseded by paid session" },
      });

      // Close previous active sessions for this SPOT
      await prisma.session.updateMany({
        where: {
          spotId: spot.id,
          status: { in: [SessionStatus.approved_pt, SessionStatus.paid] },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        data: { status: SessionStatus.void, notes: "spot taken by new user" },
      });

      // Find the payment record to link to the session
      const payment = await prisma.payment.findFirst({
        where: { stripeCheckoutSessionId: cs.id },
      });

      // Create paid session linked to payment
      const newSession = await prisma.session.create({
        data: {
          vehicleId: vehicle.id,
          spotId: spot.id,
          status: SessionStatus.paid,
          source: "visitor_payment",
          expiresAt,
          phoneNumber: phone,
          paymentId: payment?.id || null,
        },
      });

      console.log("[Stripe Webhook] Session created successfully:", {
        sessionId: newSession.id,
        plate,
        spotLabel,
        expiresAt: expiresAt.toISOString()
      });

      // Send confirmation SMS
      if (phone && isTwilioConfigured()) {
        const statusUrl = buildStatusUrl(newSession.id);
        sendParkingConfirmation(phone, spotLabel, expiresAt, statusUrl).catch(
          (err) => console.error("Failed to send parking confirmation:", err)
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
