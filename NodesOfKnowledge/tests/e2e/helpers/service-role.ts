// Shared service-role Supabase client for Playwright test *setup only*.
//
// Some e2e setup steps have, by this application's deliberate design, no
// client-facing, app-level path at all: granting reviewer status (see
// helpers/reviewer.ts and docs/decisions/0009-reviewer-authorization-table.md)
// and creating a `people` row (see helpers/people.ts and
// docs/decisions/0001-separate-people-from-user-accounts.md). Both are
// performed here through a trusted service-role connection — exactly the
// "trusted service-role connection" role the migrations describe, the same
// way this project's pgTAP coverage inserts those rows directly as the
// table owner. This is never used to bypass authorization *inside* the app:
// every browser assertion still exercises the real, RLS/authorization-gated
// paths. Extracted into this one module so reviewer.ts and people.ts share a
// single connection and a single, server-only credential read.
//
// Credential boundary (unchanged from the original reviewer.ts version):
// this reads process.env.SUPABASE_SERVICE_ROLE_KEY and lives only under
// tests/ — it is never imported by application/Client Component code and the
// key is never hardcoded or committed. playwright.config.ts loads
// .env.local (via process.loadEnvFile) before the suite runs; a value
// exported directly in the shell still wins. If the variable is unset, the
// first call throws a clear, actionable error rather than an opaque
// network/auth failure.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../src/types/database.types";

let cachedClient: SupabaseClient<Database> | null = null;

export function getServiceRoleClient(): SupabaseClient<Database> {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. The e2e tests need a " +
        "service-role connection for privileged setup (granting reviewer " +
        "status and creating disposable `people` fixtures), since there is " +
        "deliberately no client-facing way to do either (see " +
        "docs/decisions/0009-reviewer-authorization-table.md and " +
        "docs/decisions/0001-separate-people-from-user-accounts.md). Add it " +
        "to .env.local as SUPABASE_SERVICE_ROLE_KEY=<value> (get the local " +
        "value from `npm run supabase:status`) -- playwright.config.ts loads " +
        ".env.local automatically before running `npm run test:e2e`. Never " +
        "commit this value; see docs/supabase-development.md.",
    );
  }

  cachedClient = createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return cachedClient;
}
