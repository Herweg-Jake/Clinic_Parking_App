import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { validateExtensionToken, markTokenUsed } from "@/lib/tokens";
import { getParkingConfig } from "@/lib/config";
import { SessionStatus } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, hours } = body;

    if (!token || !hours) {
      return NextResponse.json(
        { error: "Token and hours are required" },
        { status: 400 }
      );
    }

    // Validate hours
    const numHours = Number(hours);
    if (isNaN(numHours) || numHours < 1 || numHours > 12) {
      return NextResponse.json(
        { error: "Hours must be between 1 and 12" },
        { status: 400 }
      );
    }

    // Validate token and get session ID
    const sessionId = await validateExtensionToken(token);
    if (!sessionId) {
      return NextResponse.json(
        { error: "Invalid or expired extension link" },
        { status: 400 }
      );
    }

    // Get session with spot info
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        spot: true,
        vehicle: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Check if session is still active
    if (session.status !== SessionStatus.paid) {
      return NextResponse.json(
        { error: "Only paid sessions can be extended" },
        { status: 400 }
      );
    }

    // Check if session hasn't expired yet (allow small grace period)
    const graceMs = 5 * 60 * 1000; // 5 minute grace
    if (session.expiresAt && session.expiresAt.getTime() + graceMs < Date.now()) {
      return NextResponse.json(
        { error: "Session has expired. Please start a new check-in." },
        { status: 400 }
      );
    }

    // Get pricing
    const config = await getParkingConfig();
    const totalCents = config.currentRateCents * numHours;
    const totalMinutes = 60 * numHours;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Create Stripe checkout for extension
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${baseUrl}/success?extended=true`,
      cancel_url: `${baseUrl}/extend/${token}`,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Parking Extension - Spot ${session.spot.label} (+${numHours} ${numHours === 1 ? "hour" : "hours"})${config.isWeekend ? " - Weekend Rate" : ""}`,
            },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "extension",
        sessionId: session.id,
        extensionToken: token,
        hours: String(numHours),
        durationMinutes: String(totalMinutes),
        plate: session.vehicle.licensePlate,
        spotLabel: session.spot.label,
        phone: session.phoneNumber || "",
      },
    });

    // Track payment initiation - MUST await to ensure record exists before webhook
    try {
      await prisma.payment.create({
        data: {
          stripeCheckoutSessionId: checkout.id,
          amountCents: totalCents,
          status: "initiated",
        },
      });
    } catch (err: unknown) {
      console.error("Failed to track extension payment:", err);
      // Continue anyway - webhook will still work with metadata
    }

    return NextResponse.json({ redirectUrl: checkout.url });
  } catch (error: any) {
    console.error("Session extend error:", error);
    return NextResponse.json(
      { error: "Failed to process extension", message: error.message },
      { status: 500 }
    );
  }
}
