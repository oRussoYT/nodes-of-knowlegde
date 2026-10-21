// Supabase client for use in Server Components, Server Actions, and Route
// Handlers. Reads/writes the request's cookie store via Next.js's
// asynchronous `cookies()` API.
//
// This file imports `next/headers`, which Next.js only makes available in
// server-only module graphs. Importing it from a Client Component fails the
// build rather than silently bundling server code into the browser — that
// is the enforcement mechanism for "do not import server-only utilities
// into client components" (see docs/authentication-implementation.md).
//
// Do not add the Supabase secret/service-role key to this client. Every
// operation performed with it runs as the signed-in user (or anonymous),
// subject to Row Level Security — see CLAUDE.md and
// docs/database-implementation.md.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database.types";
import { getSupabaseEnv } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // `setAll` was called from a Server Component, which cannot write
          // cookies. This is safe to ignore only because src/proxy.ts
          // refreshes and persists the session on every request that isn't
          // itself a Server Component render — see
          // src/lib/supabase/proxy.ts.
        }
      },
    },
  });
}
