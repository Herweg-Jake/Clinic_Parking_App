import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const spots = await prisma.spot.findMany({
    orderBy: { label: "asc" },
    select: { id: true, label: true, isActive: true },
  });
  return NextResponse.json({ count: spots.length, spots });
}
