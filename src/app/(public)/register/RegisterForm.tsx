"use client";

import { useActionState } from "react";

import { ResendConfirmationForm } from "@/components/auth/ResendConfirmationForm";
import { Checkbox } from "@/components/ui/Checkbox";
import { Divider } from "@/components/ui/Divider";
import { FieldError } from "@/components/ui/FieldError";
import { FormField } from "@/components/ui/FormField";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { registerAction } from "@/features/auth/actions/register";
import { initialRegisterState } from "@/features/auth/actions/state";
import { PASSWORD_POLICY_HINT } from "@/lib/auth/password-policy";

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialRegisterState);

  // Explicit "confirmation email sent" state.
  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-6">
        <FormMessage tone="success">
          Check your email to confirm your account. If that address can receive mail, we&apos;ve
          sent a confirmation link — it may take a minute to arrive. (Local development: open{" "}
          <strong>Mailpit</strong> to view it — see docs/authentication-implementation.md.)
        </FormMessage>

        <div>
          <Divider className="mb-4" />
          <p className="text-sm text-muted-foreground">Didn&apos;t get it?</p>
          <div className="mt-3">
            <ResendConfirmationForm email={state.email} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {state.status === "error" && state.formError ? (
        <FormMessage tone="error">{state.formError}</FormMessage>
      ) : null}

      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />

      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.password}
        hint={PASSWORD_POLICY_HINT}
      />

      <FormField
        label="Confirm password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirmPassword}
      />

      <div className="flex flex-col gap-1.5">
        <Checkbox
          name="termsAccepted"
          aria-describedby={state.fieldErrors?.termsAccepted ? "termsAccepted-error" : undefined}
          label={
            <>
              I agree to the Terms of Service and Privacy Notice. (Placeholder — Nodes of Knowledge&apos;s
              final policies have not been published yet.)
            </>
          }
        />
        {state.fieldErrors?.termsAccepted ? (
          <FieldError id="termsAccepted-error">{state.fieldErrors.termsAccepted}</FieldError>
        ) : null}
      </div>

      <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
    </form>
  );
}
