"use client";
// Use the core Supabase JS client on the browser.
import { createClient } from "@supabase/supabase-js";

// If you have generated DB types, you can import and pass them as a generic.
// Otherwise, omit the <any> generic entirely.
export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient<any>(url, key);
}
