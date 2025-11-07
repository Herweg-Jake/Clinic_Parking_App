import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/permits?q=ABC
 * Lists permits (joined with vehicles), optional search by plate fragment.
 */
export async function GET(req: Request) {
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
}
