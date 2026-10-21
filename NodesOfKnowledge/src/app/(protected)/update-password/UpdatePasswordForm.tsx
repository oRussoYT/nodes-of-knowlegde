"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormField } from "@/components/ui/FormField";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { updatePasswordAction } from "@/features/auth/actions/update-password";
import { initialUpdatePasswordState } from "@/features/auth/actions/state";
import { PASSWORD_POLICY_HINT } from "@/lib/auth/password-policy";

export function UpdatePasswordForm() {
  const [state, formAction] = useActionState(updatePasswordAction, initialUpdatePasswordState);

  // Explicit "password-update success" state.
  if (state.status === "success") {
    return (
      <FormMessage tone="success">
        Your password has been updated. You can continue to{" "}
        <Link href="/member" className="font-medium underline underline-offset-2">
          the member area
        </Link>{" "}
        with your new password.
      </FormMessage>
    );
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {state.status === "error" && state.formError ? (
        <FormMessage tone="error">{state.formError}</FormMessage>
      ) : null}

      <FormField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.password}
        hint={PASSWORD_POLICY_HINT}
      />

      <FormField
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirmPassword}
      />

      <SubmitButton pendingLabel="Updating…">Update password</SubmitButton>
    </form>
  );
}
