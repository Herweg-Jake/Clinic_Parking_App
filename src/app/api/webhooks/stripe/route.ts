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

  if (event.type === "checkout.session.completed") {
    const cs = event.data.object as Stripe.Checkout.Session;

    // 1) mark payment paid (idempotent)
    await prisma.payment.updateMany({
      where: { stripeCheckoutSessionId: cs.id },
      data: { status: "paid", paidAt: new Date() },
    });

    // Check if this is an extension payment
    const paymentType = cs.metadata?.type;

    if (paymentType === "extension") {
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

      if (plate && spotLabel) {
        const [spot, vehicle] = await Promise.all([
          prisma.spot.findUnique({ where: { label: spotLabel } }),
          prisma.vehicle.findUnique({ where: { licensePlate: plate } }),
        ]);

        if (spot && vehicle) {
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

          // Create paid session
          const newSession = await prisma.session.create({
            data: {
              vehicleId: vehicle.id,
              spotId: spot.id,
              status: SessionStatus.paid,
              source: "visitor_payment",
              expiresAt,
              phoneNumber: phone,
            },
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
    }
  }

  return NextResponse.json({ received: true });
}
