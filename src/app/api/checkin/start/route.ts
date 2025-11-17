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
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { plate, email, phone, spotLabel, parkingType, nevadaPtCode, hours } = parsed.data;

    // 1) Basic lookups
    const normalized = normalizePlate(plate);
    const spot = await prisma.spot.findUnique({ where: { label: spotLabel } });
    if (!spot || !spot.isActive) {
      return NextResponse.json({ error: "Invalid or inactive spot" }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.upsert({
      where: { licensePlate: normalized },
      update: { ownerEmail: email || null, ownerPhone: phone || null },
      create: { licensePlate: normalized, ownerEmail: email || null, ownerPhone: phone || null },
    });

    // 2) One active session per vehicle: close prior active sessions for this vehicle
    await prisma.session.updateMany({
      where: {
        vehicleId: vehicle.id,
        status: { in: ["approved_pt", "paid"] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      data: { status: "void", notes: "superseded by new check-in" },
    });

    // 3) Block double-parking: ensure this spot isn't already occupied
    const activeInSpot = await prisma.session.findFirst({
      where: {
        spotId: spot.id,
        status: { in: ["approved_pt", "paid"] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (activeInSpot) {
      return NextResponse.json(
        { error: `Spot ${spot.label} is currently occupied. Please choose another spot.` },
        { status: 409 }
      );
    }

    // 4) Read config (rate + duration)
    const { rateCents, durationMinutes } = await getParkingConfig();

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
      await prisma.session.create({
        data: {
          vehicleId: vehicle.id,
          spotId: spot.id,
          status: "approved_pt",
          source: "nevada_pt_code",
          expiresAt,
        },
      });

      return NextResponse.json({
        message: `Welcome! Your parking is approved until ${expiresAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      });
    }

    // 5) Visitor path → Stripe Checkout
    const visitorHours = hours || 1; // Default to 1 hour if not specified
    const totalCents = rateCents * visitorHours; // $2/hour * hours
    const totalMinutes = 60 * visitorHours; // 60 minutes per hour

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const checkout = await stripe.checkout.sessions.create({
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
    });

    // Track initiation
    await prisma.payment.create({
      data: {
        stripeCheckoutSessionId: checkout.id,
        amountCents: totalCents,
        status: "initiated",
      },
    });

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
