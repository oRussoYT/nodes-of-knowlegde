"use client";

import { useActionState } from "react";

import { FormField } from "@/components/ui/FormField";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { forgotPasswordAction } from "@/features/auth/actions/forgot-password";
import { initialForgotPasswordState } from "@/features/auth/actions/state";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialForgotPasswordState);

  if (state.status === "success") {
    return (
      <FormMessage tone="success">
        If an account exists for that email address, we&apos;ve sent a link to reset the
        password. (Local development: open <strong>Mailpit</strong> to view it.)
      </FormMessage>
    );
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />

      <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
    </form>
  );
}
