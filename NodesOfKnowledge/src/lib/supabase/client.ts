// Supabase client for use in the browser (Client Components only).
//
// Uses only public environment variables (see src/lib/supabase/env.ts).
// Never import this module's server counterparts (src/lib/supabase/server.ts,
// src/lib/supabase/proxy.ts) from here or from any Client Component — those
// read `next/headers`/`next/server`, which are server-only APIs and are not
// available in the browser bundle.

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database.types";
import { getSupabaseEnv } from "./env";

export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();

  return createBrowserClient<Database>(url, publishableKey);
}
