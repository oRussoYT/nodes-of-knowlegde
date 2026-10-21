"use client";

// Submit button that disables itself and shows a pending label while its
// enclosing <form>'s Server Action is in flight — this is what prevents
// duplicate submissions (a double click can't fire the action twice) and
// gives visible pending-state feedback without any custom state wiring.
//
// Public API (children, pendingLabel) is unchanged from M4 — every existing
// call site keeps working unmodified. Internals now render from
// `buttonVariants()` (src/components/ui/Button.tsx) instead of hand-rolled
// Tailwind classes, so this and the new generic `Button` stay visually
// identical and both are fully token-driven (docs/m5-application-ui-design-system.md,
// item 2 acceptance criteria: "existing FormField, FormMessage, and
// SubmitButton/Button are extended in place ... rather than duplicated").
// `useFormStatus` requires a Client Component and a real ancestor <form>;
// this cannot be replaced by the generic Button, which has no pending state.
import { useFormStatus } from "react-dom";

import { buttonVariants } from "./Button";

interface SubmitButtonProps {
  children: React.ReactNode;
  pendingLabel?: string;
}

export function SubmitButton({ children, pendingLabel }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={buttonVariants({ emphasis: "primary", size: "md", fullWidth: true })}
    >
      {pending ? (pendingLabel ?? "Please wait…") : children}
    </button>
  );
}
