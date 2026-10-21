// Shared environment-variable access for every Supabase client utility in
// src/lib/supabase/*. Centralized here so client.ts, server.ts, and
// proxy.ts validate and read the same variables the same way (per
// docs/authentication-implementation.md — "avoid duplicating
// client-construction logic").
//
// Only PUBLIC (`NEXT_PUBLIC_*`) variables belong in this file. Never add a
// secret/service-role key here — see "Credentials that must never be
// committed" in docs/supabase-development.md.

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `Missing required environment variable: ${name}. Copy .env.example ` +
          "to .env.local and fill in your local Supabase values (run " +
          "`npm run supabase:status` for local URLs/keys) — see " +
          "docs/supabase-development.md.",
      );
    }

    if (name === "NEXT_PUBLIC_SUPABASE_URL") {
      return "http://127.0.0.1:54321";
    }

    if (name === "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") {
      return "local-publishable-key";
    }

    return "";
  }

  return value;
}

export interface SupabaseEnv {
  url: string;
  publishableKey: string;
}

/** Public Supabase project configuration — safe to reach from the browser. */
export function getSupabaseEnv(): SupabaseEnv {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  };
}

/**
 * The public site URL, used to build absolute links (e.g. the
 * Supabase Auth email confirmation/recovery callback). Falls back to the
 * local development default so `npm run dev` works without extra setup.
 */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
