import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        validations: {
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    return NextResponse.json({ business });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    if (msg === "unauthorized" || msg === "forbidden") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("Get business error:", err);
    return NextResponse.json({ error: "Failed to fetch business" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await req.json();
    const { name, contactEmail, contactPhone, monthlyFeeCents, isActive } = body;

    const data: Record<string, unknown> = {};
    if (typeof name === "string" && name.trim()) data.name = name.trim();
    if (typeof contactEmail === "string") data.contactEmail = contactEmail.trim() || null;
    if (typeof contactPhone === "string") data.contactPhone = contactPhone.trim() || null;
    if (typeof monthlyFeeCents === "number" && monthlyFeeCents >= 0) {
      data.monthlyFeeCents = Math.floor(monthlyFeeCents);
    }
    if (typeof isActive === "boolean") data.isActive = isActive;

    const business = await prisma.business.update({
      where: { id },
      data,
    });

    return NextResponse.json({ business });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    if (msg === "unauthorized" || msg === "forbidden") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("Update business error:", err);
    return NextResponse.json({ error: "Failed to update business" }, { status: 500 });
  }
}
