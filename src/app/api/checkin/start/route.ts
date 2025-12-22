import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { normalizePlate } from "@/lib/plates";
import { getParkingConfig } from "@/lib/config";
import { checkinSchema, formatPhoneE164 } from "@/lib/schemas";
import { SessionStatus } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || ""); // use account default API version

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = checkinSchema.safeParse(body);
    if (!parsed.success) {
      // Return detailed validation errors
      const firstError = parsed.error.issues[0];
      const errorMessage = firstError?.message || "Invalid input";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    const { plate, email, phone, spotLabel, parkingType, nevadaPtCode, hours } = parsed.data;

    // 1) Normalize plate and parallelize initial lookups
    const normalized = normalizePlate(plate);

    // Parallelize spot lookup and config fetch
    const [spot, config] = await Promise.all([
      prisma.spot.findUnique({ where: { label: spotLabel } }),
      getParkingConfig(),
    ]);

    if (!spot || !spot.isActive) {
      return NextResponse.json({ error: "Invalid or inactive spot" }, { status: 400 });
    }

    // Use currentRateCents which applies weekend pricing automatically
    const { currentRateCents, isWeekend } = config;

    // 2) Upsert vehicle with contact info
    const vehicle = await prisma.vehicle.upsert({
      where: { licensePlate: normalized },
      update: { ownerEmail: email || null, ownerPhone: phone || null },
      create: { licensePlate: normalized, ownerEmail: email || null, ownerPhone: phone || null },
    });

    // 3) Close prior active sessions for this VEHICLE
    const closeVehicleSessions = prisma.session.updateMany({
      where: {
        vehicleId: vehicle.id,
        status: { in: [SessionStatus.approved_pt, SessionStatus.paid] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      data: { status: SessionStatus.void, notes: "superseded by new check-in" },
    });

    // 4) Close prior active sessions for this SPOT (spot override - new user takes over)
    const closeSpotSessions = prisma.session.updateMany({
      where: {
        spotId: spot.id,
        status: { in: [SessionStatus.approved_pt, SessionStatus.paid] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      data: { status: SessionStatus.void, notes: "spot taken by new user" },
    });

    if (parkingType === "nevada_pt") {
      // Nevada PT path: verify code
      const correctCode = await prisma.config.findUnique({ where: { key: "nevada_pt_code" } });
      const validCode = correctCode?.value || "NVPT2025"; // Default code

      if (!nevadaPtCode || nevadaPtCode.trim().toUpperCase() !== validCode.toUpperCase()) {
        return NextResponse.json(
          { error: "Invalid Nevada PT code. Please check your code and try again." },
          { status: 403 }
        );
      }

      // PT patients get NO expiration - they stay until spot is taken by new user
      // Close prior sessions and create new session with no expiry
      await Promise.all([
        closeVehicleSessions,
        closeSpotSessions,
        prisma.session.create({
          data: {
            vehicleId: vehicle.id,
            spotId: spot.id,
            status: SessionStatus.approved_pt,
            source: "nevada_pt_code",
            expiresAt: null, // No expiration for PT patients
            phoneNumber: null, // PT patients don't get SMS notifications
          },
        }),
      ]);

      return NextResponse.json({
        message: `Welcome! Your parking is approved. No time limit - just check in again if you return later.`,
      });
    }

    // 5) Visitor path → Stripe Checkout
    const visitorHours = hours || 1; // Default to 1 hour if not specified
    const totalCents = currentRateCents * visitorHours; // Uses weekend pricing when applicable
    const totalMinutes = 60 * visitorHours; // 60 minutes per hour

    // Format phone for Twilio SMS
    const formattedPhone = phone ? formatPhoneE164(phone) : null;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Parallelize Stripe checkout creation and closing prior sessions
    const [checkout] = await Promise.all([
      stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${baseUrl}/success`,
        cancel_url: `${baseUrl}/checkin?spot=${encodeURIComponent(spotLabel)}`,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Parking - Spot ${spotLabel} (${visitorHours} ${visitorHours === 1 ? 'hour' : 'hours'})${isWeekend ? ' - Weekend Rate' : ''}`,
              },
              unit_amount: totalCents,
            },
            quantity: 1,
          },
        ],
        metadata: {
          plate: normalized,
          spotLabel,
          hours: String(visitorHours),
          durationMinutes: String(totalMinutes),
          phone: formattedPhone || "", // Pass phone for session creation in webhook
          email: email || "",
        },
      }),
      closeVehicleSessions,
      closeSpotSessions,
    ]);

    // Track initiation (non-blocking - fire and forget)
    prisma.payment.create({
      data: {
        stripeCheckoutSessionId: checkout.id,
        amountCents: totalCents,
        status: "initiated",
      },
    }).catch((err: unknown) => console.error("Failed to track payment initiation:", err));

    // Return immediately with redirect URL
    return NextResponse.json({ redirectUrl: checkout.url });
  } catch (err: any) {
    console.error("Checkin error:", err);
    return NextResponse.json({
      error: "Server error",
      message: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined
    }, { status: 500 });
  }
}
