// Token-exchange endpoint for both the signup-confirmation and
// password-recovery email links. This is Supabase's current recommended
// PKCE-flow pattern for password-based auth — one endpoint, disambiguated
// by the `type` query parameter (`email` for signup confirmation,
// `recovery` for password reset), rather than a separate OAuth-style
// `/auth/callback` authorization-code exchange.
//
// Route-naming note (see docs/authentication-implementation.md, "Route
// map"): the milestone brief listed both `/auth/callback` and
// `/auth/confirm` as routes to implement. This project implements only
// `/auth/confirm`, because there is no separate authorization-code exchange
// step to callback into — email/password auth with Supabase's SSR helpers
// uses exactly this one `verifyOtp(token_hash, type)` endpoint for both
// flows. A `/auth/callback` route would have nothing to do and would be
// dead code. If social/OAuth login is added in a later milestone (out of
// scope here — see CLAUDE.md), that flow uses a `code` exchange and would
// justify introducing a real `/auth/callback` then.

import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import {
  getRecoveryFlowHintCookieOptions,
  RECOVERY_FLOW_HINT_COOKIE,
} from "@/lib/auth/recovery-flow-hint";
import { sanitizeReturnTo } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // `next` is only ever set by this app's own email templates
  // (supabase/templates/confirmation.html, recovery.html) to a fixed,
  // known-safe path — but it still arrives as a request query parameter, so
  // it's sanitized the same as any other redirect target rather than
  // trusted implicitly.
  const next = sanitizeReturnTo(searchParams.get("next"), "/member");

  if (tokenHash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = next;
      // Strip every query parameter (token_hash, type, next) from the
      // visible destination — "protection against accidental disclosure
      // through URL query parameters" — before adding a single, harmless,
      // app-chosen flag so /member can show an explicit "confirmation
      // success" state (see docs/authentication-implementation.md,
      // "User-facing states"). It carries no sensitive data. The recovery
      // flow doesn't need an equivalent flag: landing on /update-password
      // with the recovery-flow hint cookie set (below) already is that
      // state — see src/app/(protected)/update-password/page.tsx.
      redirectUrl.search = "";

      if (type === "email") {
        redirectUrl.searchParams.set("confirmed", "1");
      }

      const redirectResponse = NextResponse.redirect(redirectUrl);

      if (type === "recovery") {
        // A best-effort UX hint that this visit followed the recovery
        // email link — NOT a security guarantee. See
        // src/lib/auth/recovery-flow-hint.ts for why, and for what the
        // real authorization boundary is.
        redirectResponse.cookies.set(
          RECOVERY_FLOW_HINT_COOKIE,
          "1",
          getRecoveryFlowHintCookieOptions(),
        );
      }

      return redirectResponse;
    }
  }

  const errorUrl = request.nextUrl.clone();
  errorUrl.pathname = "/auth/error";
  errorUrl.search = "";
  return NextResponse.redirect(errorUrl);
}
