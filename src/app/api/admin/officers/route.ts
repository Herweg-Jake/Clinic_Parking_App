import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function normalizeBadge(raw: string): string {
  return raw.trim().replace(/[^A-Za-z0-9-]/g, "");
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const activeOnly = url.searchParams.get("active") === "true";
    const officers = await prisma.officer.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ officers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    if (msg === "unauthorized" || msg === "forbidden") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("List officers error:", err);
    return NextResponse.json({ error: "Failed to list officers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { name, badgeNumber } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!badgeNumber || typeof badgeNumber !== "string") {
      return NextResponse.json({ error: "Badge number is required" }, { status: 400 });
    }

    const badge = normalizeBadge(badgeNumber);
    if (!badge) {
      return NextResponse.json({ error: "Badge number must be alphanumeric" }, { status: 400 });
    }

    const existing = await prisma.officer.findUnique({ where: { badgeNumber: badge } });
    if (existing) {
      return NextResponse.json({ error: "That badge number is already in use" }, { status: 409 });
    }

    const officer = await prisma.officer.create({
      data: { name: name.trim(), badgeNumber: badge },
    });
    return NextResponse.json({ officer });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    if (msg === "unauthorized" || msg === "forbidden") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("Create officer error:", err);
    return NextResponse.json({ error: "Failed to create officer" }, { status: 500 });
  }
}
