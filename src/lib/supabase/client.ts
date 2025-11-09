"use client";
// Use the SSR-compatible browser client for proper cookie handling
import { createBrowserClient } from "@supabase/ssr";

// If you have generated DB types, you can import and pass them as a generic.
// Otherwise, omit the <any> generic entirely.
export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient<any>(url, key);
}
