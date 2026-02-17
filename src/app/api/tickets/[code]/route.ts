import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        code: ticket.code,
        plate: ticket.plate,
        spot: ticket.spot,
        amountCents: ticket.amountCents,
        notes: ticket.notes,
        issuedAt: ticket.issuedAt,
        paidAt: ticket.paidAt,
        isPaid: !!ticket.paidAt,
      },
    });
  } catch (err: any) {
    console.error("Fetch ticket error:", err);
    return NextResponse.json(
      { error: "Failed to fetch ticket" },
      { status: 500 }
    );
  }
}
