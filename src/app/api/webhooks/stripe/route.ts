import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getParkingConfig } from "@/lib/config";

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

    // 2) create a parking session from metadata
    const plate = String(cs.metadata?.plate || "");
    const spotLabel = String(cs.metadata?.spotLabel || "");
    const customDurationMinutes = cs.metadata?.durationMinutes ? Number(cs.metadata.durationMinutes) : null;

    if (plate && spotLabel) {
      const [spot, vehicle] = await Promise.all([
        prisma.spot.findUnique({ where: { label: spotLabel } }),
        prisma.vehicle.findUnique({ where: { licensePlate: plate } }),
      ]);

      if (spot && vehicle) {
        // Use custom duration from metadata (based on hours purchased) or fall back to config default
        const durationMinutes = customDurationMinutes || (await getParkingConfig()).durationMinutes;
        const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

        // Ensure previous active sessions for this vehicle are closed
        await prisma.session.updateMany({
          where: { vehicleId: vehicle.id, status: { in: ["approved_pt", "paid"] } },
          data: { status: "void", notes: "superseded by paid session" },
        });

        // Create paid session
        await prisma.session.create({
          data: {
            vehicleId: vehicle.id,
            spotId: spot.id,
            status: "paid",
            source: "visitor_payment",
            expiresAt,
          },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
