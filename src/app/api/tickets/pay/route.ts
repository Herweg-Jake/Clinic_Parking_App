import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Ticket code is required" },
        { status: 400 }
      );
    }

    const ticket = await prisma.ticket.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.paidAt) {
      return NextResponse.json(
        { error: "This ticket has already been paid" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${baseUrl}/ticket-paid?code=${encodeURIComponent(ticket.code)}`,
      cancel_url: `${baseUrl}/pay-ticket?code=${encodeURIComponent(ticket.code)}`,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Parking Ticket ${ticket.code} - Spot ${ticket.spot}`,
            },
            unit_amount: ticket.amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "ticket_payment",
        ticketCode: ticket.code,
        ticketId: ticket.id,
      },
    });

    return NextResponse.json({ redirectUrl: checkout.url });
  } catch (err: any) {
    console.error("Ticket payment error:", err);
    return NextResponse.json(
      { error: "Failed to initiate payment" },
      { status: 500 }
    );
  }
}
