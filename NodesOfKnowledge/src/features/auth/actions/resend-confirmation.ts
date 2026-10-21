"use server";

import { logAuthEvent } from "@/lib/auth/dev-logger";
import { validateEmailOnly } from "@/lib/auth/validation";
import { getSiteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

import type { ResendConfirmationActionState } from "./state";

/**
 * Re-sends the signup-confirmation email. Deliberately as neutral as
 * `forgotPasswordAction` (src/features/auth/actions/forgot-password.ts):
 * the result is never surfaced to the client, so this cannot be used to
 * enumerate accounts by checking whether an address is registered, already
 * confirmed, or not registered at all — every case returns the same
 * success state. Cooldown/pending-state protection against repeated
 * submissions lives client-side in
 * src/components/auth/ResendConfirmationForm.tsx; Supabase's own
 * `[auth.rate_limit] email_sent` (supabase/config.toml) is the
 * server-side backstop.
 */
export async function resendConfirmationAction(
  _prevState: ResendConfirmationActionState,
  formData: FormData,
): Promise<ResendConfirmationActionState> {
  const validation = validateEmailOnly(formData.get("email"));

  if (!validation.ok || !validation.value) {
    // Field-level "enter a valid email" validation only — says nothing
    // about whether an account exists for that address.
    return { status: "error", fieldErrors: validation.fieldErrors };
  }

  const supabase = await createClient();

  // The return value to the client stays neutral regardless of `error` —
  // see the note above. `error` is only used for the dev-only sanitized
  // diagnostic below (src/lib/auth/dev-logger.ts), never to branch on the
  // response sent back to the caller.
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: validation.value.email,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/confirm`,
    },
  });

  logAuthEvent({
    operation: "resend",
    email: validation.value.email,
    success: !error,
    errorCode: error?.code,
    errorMessage: error?.message,
  });

  return { status: "success", nonce: Date.now() };
}
