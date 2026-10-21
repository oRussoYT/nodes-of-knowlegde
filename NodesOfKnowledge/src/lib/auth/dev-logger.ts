// Temporary-by-design, safe diagnostic logging for local development only.
//
// Added to root-cause why registration/resend/forgot-password emails were
// not reliably observed in Mailpit during local E2E runs, without violating
// the enumeration-safety of those flows or exposing anything sensitive.
//
// Hard rules, enforced by construction here:
//   - Never logs passwords, tokens, confirmation/recovery links, or secret
//     keys.
//   - Never logs a full Supabase Auth response — only a boolean
//     "did we get a user id back", plus the error's own `code`/`message`
//     (Supabase's own short, non-identity-revealing failure strings, e.g.
//     "weak_password", "over_email_send_rate_limit" — never raw request or
//     token data).
//   - Never runs in production (`NODE_ENV === "production"` is a no-op).
//   - Only ever logs a masked email (local part reduced to first/last
//     character), never the full address.
//
// This does not change any Server Action's return value to the client —
// every call site here is purely observational, wrapped around results that
// are already being discarded/mapped for the neutral, enumeration-safe
// responses those actions send back. If this stops being useful, delete the
// file and its three call sites; nothing else depends on it.

const isDev = process.env.NODE_ENV !== "production";

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const maskedLocal = local.length <= 2 ? "*".repeat(local.length) : `${local[0]}***${local[local.length - 1]}`;

  return `${maskedLocal}@${domain}`;
}

export interface AuthEventLog {
  operation: "signUp" | "resend" | "resetPasswordForEmail";
  email: string;
  success: boolean;
  /** Supabase's own short error code (e.g. "weak_password"), if any. */
  errorCode?: string;
  /** Supabase's own short error message, if any — not a raw response dump. */
  errorMessage?: string;
  /** Whether a user id came back on the response (existence only, never the id itself). */
  userIdReturned?: boolean;
}

/** Logs a single safe, sanitized line for a local-dev auth operation. No-op in production. */
export function logAuthEvent(event: AuthEventLog): void {
  if (!isDev) return;

  const parts = [
    `[auth-dev] ${event.operation}`,
    `email=${maskEmail(event.email)}`,
    `success=${event.success}`,
  ];

  if (event.userIdReturned !== undefined) parts.push(`userIdReturned=${event.userIdReturned}`);
  if (event.errorCode) parts.push(`errorCode=${event.errorCode}`);
  if (event.errorMessage) parts.push(`errorMessage=${JSON.stringify(event.errorMessage)}`);

  console.log(parts.join(" "));
}
