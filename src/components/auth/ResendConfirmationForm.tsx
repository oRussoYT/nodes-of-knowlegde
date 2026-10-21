"use client";

import { useActionState, useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { resendConfirmationAction } from "@/features/auth/actions/resend-confirmation";
import { initialResendConfirmationState } from "@/features/auth/actions/state";

const COOLDOWN_SECONDS = 30;

interface ResendConfirmationFormProps {
  /**
   * If the caller already knows the address (e.g. right after
   * registration), it's sent as a hidden field and no email input is
   * shown. If omitted (e.g. from the login page, where we don't know
   * who's asking), the form collects it.
   */
  email?: string;
}

// Neutral resend-confirmation UI. "Neutral" here means: the response never
// changes based on whether the address is registered, already confirmed,
// or unknown (see resendConfirmationAction) — and this component never
// tries to infer that from timing, so it doesn't reintroduce an
// enumeration signal client-side either. The cooldown after a successful
// submission is purely to stop repeated clicks from spamming Supabase's
// local email rate limit — see docs/authentication-implementation.md.
export function ResendConfirmationForm({ email }: ResendConfirmationFormProps) {
  const [state, formAction] = useActionState(
    resendConfirmationAction,
    initialResendConfirmationState,
  );

  return (
    <form action={formAction} noValidate className="flex flex-col gap-3">
      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        // Explicit `id`: /login renders this form (no `email` prop, so this
        // branch renders) inside a <details>, alongside LoginForm's own
        // "Email" field — both use `name="email"`, which is fine (each
        // <form>'s FormData is scoped independently), but FormField derives
        // its `id` from `name` when none is given, which would otherwise
        // produce a second `id="email"` in the same document. Duplicate ids
        // aren't just invalid HTML: a <label for="email"> resolves to the
        // *first* matching id, so without this, clicking this form's own
        // "Email" label would have focused LoginForm's email field instead.
        <FormField
          label="Email"
          name="email"
          id="resend-email"
          type="email"
          autoComplete="email"
          required
          error={state.fieldErrors?.email}
        />
      )}

      {state.status === "success" ? (
        <p role="status" className="text-sm text-muted-foreground">
          If that address is registered and not yet confirmed, we&apos;ve sent another link.
        </p>
      ) : null}

      {state.status === "success" ? (
        // Keyed by `nonce` (a fresh value from the server on every
        // successful call) so a *second* resend, after the first cooldown
        // has already run out, remounts this with a full new countdown
        // rather than reusing stale internal state.
        <CooldownButton key={state.nonce} seconds={COOLDOWN_SECONDS} />
      ) : (
        <SubmitButton pendingLabel="Sending…">Resend confirmation email</SubmitButton>
      )}
    </form>
  );
}

interface CooldownButtonProps {
  seconds: number;
}

// Self-contained: its `remaining` state is only ever set from this same
// component's own setInterval callback — a genuine subscription to an
// external timer, not a mirror of another component's state — so there's
// no cross-state synchronization for React Compiler-oriented lint rules
// (react-hooks/set-state-in-effect, react-hooks/refs) to flag. Resetting
// the countdown for a subsequent resend is handled by remounting this
// component with a new `key` (see above), not by an effect watching props.
function CooldownButton({ seconds }: CooldownButtonProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  if (remaining <= 0) {
    return <SubmitButton pendingLabel="Sending…">Resend confirmation email</SubmitButton>;
  }

  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      className={buttonVariants({ emphasis: "primary", size: "md", fullWidth: true })}
    >
      Resend available in {remaining}s
    </button>
  );
}
