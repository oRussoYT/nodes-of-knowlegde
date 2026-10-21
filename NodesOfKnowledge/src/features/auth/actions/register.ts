"use server";

// Registration only ever creates a Supabase Auth account (`auth.users`).
// Per docs/decisions/0001-separate-people-from-user-accounts.md, it must
// never create a `people` row, a `profile_claims` row, or a
// `user_person_links` row — identity claiming is a later milestone. Nothing
// below touches those tables.

import { logAuthEvent } from "@/lib/auth/dev-logger";
import { toSafeAuthErrorMessage } from "@/lib/auth/errors";
import { validateRegistration } from "@/lib/auth/validation";
import { getSiteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

import type { RegisterActionState } from "./state";

export async function registerAction(
  _prevState: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  const validation = validateRegistration({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    termsAccepted: formData.get("termsAccepted"),
  });

  if (!validation.ok || !validation.value) {
    return { status: "error", fieldErrors: validation.fieldErrors };
  }

  const supabase = await createClient();

  // Never log `error`/the response here — it can carry tokens. Only the
  // safely mapped message (toSafeAuthErrorMessage) or the neutral success
  // state below is ever returned to the client. logAuthEvent() below is a
  // dev-only, sanitized diagnostic (see src/lib/auth/dev-logger.ts) — it
  // does not change what's returned to the caller.
  const { data, error } = await supabase.auth.signUp({
    email: validation.value.email,
    password: validation.value.password,
    options: {
      // Required for Supabase's redirect allow-list check even though the
      // custom confirmation email template
      // (supabase/templates/confirmation.html) hardcodes its own `next`
      // rather than reading `{{ .RedirectTo }}` — see
      // docs/authentication-implementation.md, "Signup confirmation flow".
      emailRedirectTo: `${getSiteUrl()}/auth/confirm`,
    },
  });

  logAuthEvent({
    operation: "signUp",
    email: validation.value.email,
    success: !error,
    userIdReturned: Boolean(data?.user?.id),
    errorCode: error?.code,
    errorMessage: error?.message,
  });

  if (error) {
    // Only recognizable, non-identity-revealing failures (weak password,
    // rate limiting) get a specific message; anything else — including
    // "this email is already registered" — falls back to the same neutral
    // copy the success path implies, so this endpoint can't be used to
    // enumerate accounts.
    return { status: "error", formError: toSafeAuthErrorMessage(error) };
  }

  return { status: "success", email: validation.value.email };
}
