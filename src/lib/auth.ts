import { getRouteSupabase } from "./supabase/server";
import { prisma } from "./prisma";

export async function requireAdmin() {
  const supabase = getRouteSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("unauthorized");

  // check in your Prisma User table
  const u = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!u || u.role !== "admin") throw new Error("forbidden");

  return { user: u };
}
