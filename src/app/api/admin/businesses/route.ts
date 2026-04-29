import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function GET() {
  try {
    await requireAdmin();

    const businesses = await prisma.business.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { validations: true } },
      },
    });

    // Validations this month per business (for monthly fee tracking)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthly = await prisma.validation.groupBy({
      by: ["businessId"],
      where: { createdAt: { gte: monthStart } },
      _count: { _all: true },
    });
    const monthlyMap = new Map(monthly.map((m) => [m.businessId, m._count._all]));

    return NextResponse.json({
      businesses: businesses.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        contactEmail: b.contactEmail,
        contactPhone: b.contactPhone,
        monthlyFeeCents: b.monthlyFeeCents,
        isActive: b.isActive,
        createdAt: b.createdAt,
        totalValidations: b._count.validations,
        monthValidations: monthlyMap.get(b.id) ?? 0,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    if (msg === "unauthorized" || msg === "forbidden") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("List businesses error:", err);
    return NextResponse.json({ error: "Failed to list businesses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { name, code, contactEmail, contactPhone, monthlyFeeCents } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Business name is required" }, { status: 400 });
    }
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Validation code is required" }, { status: 400 });
    }

    const normalized = normalizeCode(code);
    if (normalized.length < 3) {
      return NextResponse.json(
        { error: "Code must be at least 3 alphanumeric characters" },
        { status: 400 }
      );
    }

    const fee =
      typeof monthlyFeeCents === "number" && monthlyFeeCents >= 0
        ? Math.floor(monthlyFeeCents)
        : 0;

    const existing = await prisma.business.findUnique({ where: { code: normalized } });
    if (existing) {
      return NextResponse.json(
        { error: "That validation code is already in use" },
        { status: 409 }
      );
    }

    const business = await prisma.business.create({
      data: {
        name: name.trim(),
        code: normalized,
        contactEmail: contactEmail?.trim() || null,
        contactPhone: contactPhone?.trim() || null,
        monthlyFeeCents: fee,
      },
    });

    return NextResponse.json({ business });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    if (msg === "unauthorized" || msg === "forbidden") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("Create business error:", err);
    return NextResponse.json({ error: "Failed to create business" }, { status: 500 });
  }
}
