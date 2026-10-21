// Session-refresh helper used by the top-level src/proxy.ts (Next.js 16's
// request-interception file, replacing the deprecated middleware.ts — see
// docs/authentication-implementation.md for why this project uses proxy.ts).
//
// This is adapted directly from Supabase's official Next.js SSR example
// (supabase/supabase, examples/auth/nextjs/lib/supabase/proxy.ts). It is
// responsible only for refreshing an expired/stale Supabase session and
// copying the refreshed cookies onto both the outgoing request (so Server
// Components in this same request see the new token) and the response (so
// the browser gets the new token). Route-protection *decisions* are
// deliberately not made here — see src/lib/auth/route-protection.ts for the
// pure, unit-tested logic, and src/proxy.ts for where it's applied.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "./env";

export interface SessionRefreshResult {
  /** The response object with refreshed session cookies already applied. */
  response: NextResponse;
  /**
   * Whether the request carries a verified session, per `getClaims()`
   * (JWT-signature verified — never derived from `getSession()` alone,
   * which is not guaranteed to be revalidated on the server).
   */
  isAuthenticated: boolean;
}

export async function updateSession(
  request: NextRequest,
): Promise<SessionRefreshResult> {
  let response = NextResponse.next({ request });

  const { url, publishableKey } = getSupabaseEnv();

  // With Fluid compute / serverless reuse, this client must be created fresh
  // on every request rather than stored in a module-level variable.
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        // Supabase asks that auth-cookie responses carry no-cache headers so
        // a CDN/reverse proxy never serves one user's refreshed session to
        // another — see docs/authentication-implementation.md, "Cache
        // behavior for authenticated pages".
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  // Do not run other Supabase/application code between createServerClient
  // and getClaims() below. A stray call here is a common source of
  // hard-to-debug "users randomly signed out" bugs, per Supabase's own
  // guidance.
  //
  // getClaims() verifies the access token's JWT signature (locally, via a
  // cached JWKS, or by confirming with the Auth server) rather than trusting
  // whatever is sitting in the session cookie — this is the "don't trust
  // getSession() alone for authorization" requirement.
  const { data, error } = await supabase.auth.getClaims();

  return {
    response,
    isAuthenticated: !error && data?.claims != null,
  };
}
