// A UX flow marker for /update-password — explicitly NOT a security or
// authorization control. Read this comment before touching anything below.
//
// httpOnly stops browser JavaScript from reading/writing this cookie, but
// it does nothing to stop the cookie's own owner from setting it — browser
// devtools, a cookie-editing extension, or a raw HTTP request with a
// forged `Cookie` header can all set a plain httpOnly cookie just fine.
// httpOnly is not tamper-proofing, and this file makes no attempt to
// tamper-proof this value: it's the literal string `"1"`, unsigned, with
// nothing cryptographically tying it to a real recovery-email
// verification, a specific user, or a specific point in time beyond its
// own expiry.
//
// That's an accepted trade-off, not an oversight. The only thing this
// cookie's presence ever influences is which explanation
// src/app/(protected)/update-password/page.tsx shows — the password form,
// or a "request a new link" message. It is never consulted for
// authorization. The actual authorization boundary for changing a
// password is, and remains, Supabase's own session check:
// `supabase.auth.updateUser()`
// (src/features/auth/actions/update-password.ts) only ever changes the
// password belonging to whoever the *current, cookie-verified Supabase
// session* is — there is no user-id parameter anywhere in that action, no
// service-role client involved, and an unauthenticated request fails
// there regardless of what this cookie says. See "Password-update
// authorization" in docs/authentication-implementation.md for the full
// audit.
//
// Concretely, forging this cookie lets an *already-authenticated* visitor
// reach the password-update form without having clicked a recovery email.
// All that ever accomplishes is changing their own password — equivalent
// to a hypothetical "change your password while signed in" feature
// already existing. It does not grant access to any other account, does
// not bypass the requirement for a real session, and is not a privilege
// escalation of any kind. An unauthenticated visitor who forges this
// cookie is still redirected to /login by
// src/app/(protected)/layout.tsx, which checks the real session
// independently and *before* this cookie is ever inspected.
//
// If a real, server-verifiable "this really came from a recovery link"
// guarantee is ever needed (e.g. to require a *fresh* recovery
// verification before a password change, distinct from "any current
// session"), this would need to become a signed/HMAC'd token with real
// key management, or a check against Supabase's own session AMR claim.
// Deliberately not done for M4 — see "Future security work" in
// docs/authentication-implementation.md.

export const RECOVERY_FLOW_HINT_COOKIE = "netpdbff_recovery_flow_hint";

/** How long the hint is shown before /update-password reverts to asking for a new link. */
export const RECOVERY_FLOW_HINT_MAX_AGE_SECONDS = 10 * 60;

interface RecoveryFlowHintCookieOptions {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  maxAge: number;
  path: string;
}

/**
 * A function, not a static object, so `secure` is evaluated against the
 * *current* `NODE_ENV` every time it's called rather than whatever it
 * happened to be when this module first loaded — matters for tests that
 * stub `NODE_ENV` (see tests/unit/recovery-flow-hint.test.ts), and is
 * simply more correct in a long-lived server process.
 */
export function getRecoveryFlowHintCookieOptions(): RecoveryFlowHintCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    // "Secure in non-local environments": true for a real (production)
    // deployment, false for `next dev` (which normally serves over plain
    // HTTP on localhost, where the `Secure` attribute would make the
    // browser silently refuse to store the cookie at all).
    secure: process.env.NODE_ENV === "production",
    maxAge: RECOVERY_FLOW_HINT_MAX_AGE_SECONDS,
    path: "/update-password",
  };
}
