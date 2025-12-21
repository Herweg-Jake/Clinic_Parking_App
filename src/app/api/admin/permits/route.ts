import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/permits?q=ABC
 * Lists permits (joined with vehicles), optional search by plate fragment.
 */
export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toUpperCase();

    const where = q ? { vehicle: { licensePlate: { contains: q } } } : undefined;

    const rows = await prisma.permit.findMany({
      where,
      orderBy: { validFrom: "desc" },
      include: {
        vehicle: true,
      },
      take: 200, // simple cap
    });

    return NextResponse.json(rows);
  } catch (e: any) {
    const msg = e?.message || "Unauthorized";
    const code = msg === "forbidden" || msg === "unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
