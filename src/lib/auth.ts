import { getRouteSupabase } from "./supabase/server";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const supabase = await getRouteSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("unauthorized");
  }

  // Check in your Prisma User table
  const u = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!u || u.role !== "admin") {
    throw new Error("forbidden");
  }

  return { user: u };
}

// Helper to check auth and redirect if needed (for client-side pages)
export async function checkAdminOrRedirect() {
  try {
    return await requireAdmin();
  } catch (error: any) {
    return null;
  }
}
