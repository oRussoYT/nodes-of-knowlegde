import type { ButtonHTMLAttributes } from "react";

import { logoutAction } from "@/features/auth/actions/logout";

interface LogoutButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children"> {}

// Server Component: renders a <form> that POSTs to a Server Action. This is
// the "logout must run server-side, not as an unsafe GET side effect"
// requirement — there is no link or onClick handler that triggers logout.
//
// Extended additively in M5.2 (ProtectedHeader's user menu,
// MobileNavigation) to accept and forward standard button attributes —
// e.g. `onClick` to close a mobile drawer after submitting, or a
// menu-styled `className` — onto the real `<button>`. The Server
// Action-backed `<form>` submission mechanism itself is unchanged from M4,
// per the M5 spec's "LogoutButton's Server Action-backed form is reused,
// not rebuilt" requirement.
export function LogoutButton({ className, ...rest }: LogoutButtonProps) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className={
          className ??
          "text-sm font-medium text-neutral-600 underline decoration-neutral-300 underline-offset-2 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        }
        {...rest}
      >
        Log out
      </button>
    </form>
  );
}
