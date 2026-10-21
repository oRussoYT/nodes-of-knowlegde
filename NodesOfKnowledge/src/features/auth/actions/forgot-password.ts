"use server";

import { logAuthEvent } from "@/lib/auth/dev-logger";
import { validateEmailOnly } from "@/lib/auth/validation";
import { getSiteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

import type { ForgotPasswordActionState } from "./state";

export async function forgotPasswordAction(
  _prevState: ForgotPasswordActionState,
  formData: FormData,
): Promise<ForgotPasswordActionState> {
  const validation = validateEmailOnly(formData.get("email"));

  if (!validation.ok || !validation.value) {
    // Field-level "enter a valid email" validation is fine to surface — it
    // says nothing about whether an account exists for that address.
    return { status: "error", fieldErrors: validation.fieldErrors };
  }

  const supabase = await createClient();

  // The client-facing result stays neutral regardless of `error` — this
  // call always reports the same success to the client, whether or not an
  // account exists for the address, and whether or not the call itself
  // errors. See docs/authentication-implementation.md, "Password recovery
  // flow". `error` is only used below for the dev-only sanitized diagnostic
  // (src/lib/auth/dev-logger.ts).
  const { error } = await supabase.auth.resetPasswordForEmail(validation.value.email, {
    redirectTo: `${getSiteUrl()}/auth/confirm`,
  });

  logAuthEvent({
    operation: "resetPasswordForEmail",
    email: validation.value.email,
    success: !error,
    errorCode: error?.code,
    errorMessage: error?.message,
  });

  return { status: "success" };
}
