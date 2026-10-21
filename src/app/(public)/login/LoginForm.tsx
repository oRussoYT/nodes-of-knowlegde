"use client";

import { useActionState } from "react";

import { FormField } from "@/components/ui/FormField";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { loginAction } from "@/features/auth/actions/login";
import { initialLoginState } from "@/features/auth/actions/state";

interface LoginFormProps {
  /** Already sanitized server-side in page.tsx — see src/lib/auth/validation.ts. */
  returnTo: string;
}

export function LoginForm({ returnTo }: LoginFormProps) {
  const [state, formAction] = useActionState(loginAction, initialLoginState);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {/* Carries the sanitized return destination through the POST. The
          server action re-sanitizes this value itself before using it —
          this hidden field is a convenience, not the security boundary. */}
      <input type="hidden" name="returnTo" value={returnTo} />

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
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />

      <SubmitButton pendingLabel="Signing in…">Log in</SubmitButton>
    </form>
  );
}
