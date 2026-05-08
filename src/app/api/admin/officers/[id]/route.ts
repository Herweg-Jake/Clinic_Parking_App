import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { name, isActive } = body;

    const data: Record<string, unknown> = {};
    if (typeof name === "string" && name.trim()) data.name = name.trim();
    if (typeof isActive === "boolean") data.isActive = isActive;

    const officer = await prisma.officer.update({ where: { id }, data });
    return NextResponse.json({ officer });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    if (msg === "unauthorized" || msg === "forbidden") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("Update officer error:", err);
    return NextResponse.json({ error: "Failed to update officer" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.officer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    if (msg === "unauthorized" || msg === "forbidden") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error("Delete officer error:", err);
    return NextResponse.json({ error: "Failed to delete officer" }, { status: 500 });
  }
}
