import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { normalizePlate } from "@/lib/plates";
import { getParkingConfig } from "@/lib/config";
import { checkinSchema } from "@/lib/schemas";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || ""); // use account default API version

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = checkinSchema.safeParse(body);
    if (!parsed.success) {
      // Return detailed validation errors
      const firstError = parsed.error.errors[0];
      const errorMessage = firstError.message || "Invalid input";
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

    const { rateCents, durationMinutes } = config;

    // 2) Parallelize vehicle upsert and active spot check
    const [vehicle, activeInSpot] = await Promise.all([
      prisma.vehicle.upsert({
        where: { licensePlate: normalized },
        update: { ownerEmail: email || null, ownerPhone: phone || null },
        create: { licensePlate: normalized, ownerEmail: email || null, ownerPhone: phone || null },
      }),
      prisma.session.findFirst({
        where: {
          spotId: spot.id,
          status: { in: ["approved_pt", "paid"] },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      }),
    ]);

    // 3) Block double-parking: ensure this spot isn't already occupied
    if (activeInSpot) {
      return NextResponse.json(
        { error: `Spot ${spot.label} is currently occupied. Please choose another spot.` },
        { status: 409 }
      );
    }

    // 4) Close prior active sessions for this vehicle (non-blocking for visitor payments)
    const closePriorSessions = prisma.session.updateMany({
      where: {
        vehicleId: vehicle.id,
        status: { in: ["approved_pt", "paid"] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      data: { status: "void", notes: "superseded by new check-in" },
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

      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

      // Parallelize closing prior sessions and creating new session
      await Promise.all([
        closePriorSessions,
        prisma.session.create({
          data: {
            vehicleId: vehicle.id,
            spotId: spot.id,
            status: "approved_pt",
            source: "nevada_pt_code",
            expiresAt,
          },
        }),
      ]);

      return NextResponse.json({
        message: `Welcome! Your parking is approved until ${expiresAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      });
    }

    // 5) Visitor path → Stripe Checkout (optimized)
    const visitorHours = hours || 1; // Default to 1 hour if not specified
    const totalCents = rateCents * visitorHours; // $2/hour * hours
    const totalMinutes = 60 * visitorHours; // 60 minutes per hour

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
              product_data: { name: `Parking - Spot ${spotLabel} (${visitorHours} ${visitorHours === 1 ? 'hour' : 'hours'})` },
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
        },
      }),
      closePriorSessions,
    ]);

    // Track initiation (non-blocking - fire and forget)
    prisma.payment.create({
      data: {
        stripeCheckoutSessionId: checkout.id,
        amountCents: totalCents,
        status: "initiated",
      },
    }).catch(err => console.error("Failed to track payment initiation:", err));

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
