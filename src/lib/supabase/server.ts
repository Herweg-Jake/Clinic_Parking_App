import { cookies } from "next/headers";
import { createServerComponentClient, createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { type Database } from "./types"; // optional if you have types; otherwise omit generics

export function getServerSupabase() {
  return createServerComponentClient<Database>({ cookies });
}

export function getRouteSupabase() {
  return createRouteHandlerClient<Database>({ cookies });
}
