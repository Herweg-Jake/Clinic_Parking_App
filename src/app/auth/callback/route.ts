import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (code) {
    // Next.js 15: cookies() is async. Capture it once, then return it from an async getter.
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({
      cookies: async () => cookieStore, // satisfies type: () => Promise<ReadonlyRequestCookies>
    });

    // Exchange the one-time code for a session (sets auth cookies)
    await supabase.auth.exchangeCodeForSession(code);
  }

  const next = url.searchParams.get("next") || "/admin/active";
  return NextResponse.redirect(new URL(next, url.origin));
}
