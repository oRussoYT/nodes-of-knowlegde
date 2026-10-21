"use server";

import { cookies } from "next/headers";

import { toSafeAuthErrorMessage } from "@/lib/auth/errors";
import {
  getRecoveryFlowHintCookieOptions,
  RECOVERY_FLOW_HINT_COOKIE,
} from "@/lib/auth/recovery-flow-hint";
import { validateUpdatePassword } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

import type { UpdatePasswordActionState } from "./state";

export async function updatePasswordAction(
  _prevState: UpdatePasswordActionState,
  formData: FormData,
): Promise<UpdatePasswordActionState> {
  const cookieStore = await cookies();

  // UX consistency only, not authorization: /update-password's own page
  // component (src/app/(protected)/update-password/page.tsx) already
  // hides the form behind this same check, so this only matters for a
  // request that skips the page entirely (a direct POST to this action).
  // It is not what stops an unauthenticated caller — see the comment
  // above the `updateUser` call below for what actually does, and
  // src/lib/auth/recovery-flow-hint.ts for why this cookie can't be
  // trusted as proof of anything.
  if (!cookieStore.get(RECOVERY_FLOW_HINT_COOKIE)) {
    return {
      status: "error",
      formError:
        "This page completes a password reset started from an email link. Request a new link from the forgot-password page.",
    };
  }

  const validation = validateUpdatePassword({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validation.ok || !validation.value) {
    return { status: "error", fieldErrors: validation.fieldErrors };
  }

  const supabase = await createClient();

  // This is the actual authorization boundary for changing a password —
  // not the cookie check above. `createClient()` builds a Supabase client
  // bound to whatever session is in *this request's own cookies*
  // (src/lib/supabase/server.ts); `updateUser` changes the password for
  // that session's user and takes no user-id argument of any kind, so
  // there is no way to target any account other than the caller's own.
  // No service-role client is used anywhere in this file or in
  // src/lib/supabase/server.ts. If the request has no valid Supabase
  // session — regardless of whether the recovery-flow hint cookie above
  // was present, absent, or forged — `updateUser` itself fails (mapped by
  // toSafeAuthErrorMessage's "session missing" case below), because the
  // Supabase client has no access token to authenticate the write with.
  // See "Password-update authorization" in
  // docs/authentication-implementation.md, and
  // tests/e2e/update-password.spec.ts for the tests exercising this.
  const { error } = await supabase.auth.updateUser({
    password: validation.value.password,
  });

  if (error) {
    return { status: "error", formError: toSafeAuthErrorMessage(error) };
  }

  // Not required for security (there's no security property being
  // revoked here — see above), but it keeps the UX hint honest: once a
  // password change has actually happened, /update-password goes back to
  // asking for a new link rather than silently allowing another change to
  // look like it's still "from" the original recovery email. Cleared with
  // the same `path` it was set with so the browser actually matches and
  // removes it rather than setting an unrelated cookie.
  cookieStore.set(RECOVERY_FLOW_HINT_COOKIE, "", {
    ...getRecoveryFlowHintCookieOptions(),
    maxAge: 0,
  });

  return { status: "success" };
}
