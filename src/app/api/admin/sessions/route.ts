import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/sessions?status=active|expired&q=PLATE&spot=A3
 * Returns sessions with vehicle + spot joined.
 */
export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status"); // "active" | "expired"
    const q = searchParams.get("q")?.trim().toUpperCase() || "";
    const spotLabel = searchParams.get("spot") || "";

    const now = new Date();
    const whereBase =
      statusParam === "expired"
        ? {
            status: { in: ["approved_pt", "paid"] },
            expiresAt: { lt: now },
          }
        : {
            status: { in: ["approved_pt", "paid"] },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          };

    const where = {
      ...whereBase,
      ...(q ? { vehicle: { licensePlate: { contains: q } } } : {}),
      ...(spotLabel ? { spot: { label: spotLabel } } : {}),
    };

    const rows = await prisma.session.findMany({
      where,
      orderBy: { startedAt: "desc" },
      include: { vehicle: true, spot: true },
    });

    return NextResponse.json(rows);
  } catch (e: any) {
    const msg = e?.message || "Unauthorized";
    const code = msg === "forbidden" || msg === "unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
