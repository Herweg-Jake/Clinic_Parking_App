import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { SessionStatus } from "@prisma/client";

/**
 * POST /api/admin/sessions/:id/extend
 * Extends an active session by 15 minutes.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const activeStatuses: SessionStatus[] = [SessionStatus.approved_pt, SessionStatus.paid];
    if (!activeStatuses.includes(session.status)) {
      return NextResponse.json({ error: "Only active sessions can be extended" }, { status: 400 });
    }

    const base = session.expiresAt ?? new Date();
    const newExpires = new Date(base.getTime() + 15 * 60 * 1000);

    await prisma.session.update({
      where: { id },
      data: { expiresAt: newExpires },
    });

    return NextResponse.json({ ok: true, expiresAt: newExpires.toISOString() });
  } catch (e: any) {
    const msg = e?.message || "Unauthorized";
    const code = msg === "forbidden" || msg === "unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
