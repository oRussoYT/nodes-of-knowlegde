"use server";

import { redirect } from "next/navigation";

import { toSafeAuthErrorMessage } from "@/lib/auth/errors";
import { sanitizeReturnTo, validateLogin } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

import type { LoginActionState } from "./state";

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const validation = validateLogin({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validation.ok || !validation.value) {
    return { status: "error", fieldErrors: validation.fieldErrors };
  }

  const supabase = await createClient();

  // Never log `error` or the response — both can carry sensitive detail
  // (Supabase does not put the raw password in the response, but the
  // access/refresh tokens on success are just as sensitive).
  const { error } = await supabase.auth.signInWithPassword(validation.value);

  if (error) {
    return { status: "error", formError: toSafeAuthErrorMessage(error) };
  }

  // `returnTo` travels through the login form as a hidden field so it
  // survives the POST — see src/app/login/LoginForm.tsx. It is re-sanitized
  // here regardless of any sanitization already applied when the field was
  // rendered, since a server action must not trust client-supplied input.
  const returnTo = sanitizeReturnTo(formData.get("returnTo") as string | null);
  redirect(returnTo);
}
