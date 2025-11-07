import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Refresh session if possible (so auth state is kept fresh)
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = req.nextUrl;
  const needsAuth =
    url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/admin");

  if (needsAuth && !session) {
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("next", url.pathname + url.search);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
