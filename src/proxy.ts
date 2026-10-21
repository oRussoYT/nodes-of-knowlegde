// Next.js 16 request-interception file. Next.js 16 renamed the previous
// `middleware.ts` convention to `proxy.ts` (the exported function is named
// `proxy`, not `middleware`); this project targets Next 16 from the start,
// so only proxy.ts exists — see docs/authentication-implementation.md for
// the migration note. Do not add a middleware.ts alongside this file.
//
// Responsibilities (and nothing else — see the linked modules for the
// actual logic, kept separate so each half is independently testable):
//   1. Refresh the Supabase session and copy the refreshed cookies onto the
//      request/response — src/lib/supabase/proxy.ts.
//   2. Decide whether this request should be redirected (protected route
//      without a session, or an authenticated visitor hitting /login or
//      /register) — src/lib/auth/route-protection.ts (pure, unit-tested).

import { NextResponse, type NextRequest } from "next/server";

import { decideProxyAction } from "@/lib/auth/route-protection";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { response, isAuthenticated } = await updateSession(request);

  const decision = decideProxyAction({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    isAuthenticated,
  });

  if (decision.action === "allow") {
    return response;
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = decision.pathname;
  redirectUrl.search = decision.search ?? "";

  const redirectResponse = NextResponse.redirect(redirectUrl);

  // Copy the refreshed session cookies onto the redirect response too. If
  // we only set them on `response` (which we're discarding in favor of the
  // redirect), a session refresh that happened on this exact request would
  // be lost and the browser/server would fall out of sync.
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}

export const config = {
  matcher: [
    /*
     * Run on every request except:
     * - _next/static (static build assets)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - common static file extensions
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
