import { Badge } from "./Badge";
import { cn } from "@/lib/ui/cn";

export interface FutureActionProps {
  /** The label of the not-yet-available destination or action. */
  label: string;
  /** Optional reason, exposed via `title` for anyone who hovers/inspects — never required reading to understand the "Soon" badge. */
  reason?: string;
  className?: string;
}

// A labeled destination or action that is real in the product's planned
// structure but not yet built — e.g. NavLink's "planned" nav entries
// (`/about`, the future `Profile` link) and, on `/member`/`/account`, the
// future claim-a-person-record step and "Account → Security". Renders as
// inert text plus a "Soon" `Badge` — deliberately never a disabled-looking
// button or a real `<a>`/`<button>` pointed at nothing, since either would
// read as "a feature exists here, you just can't use it right now" rather
// than the more honest "this doesn't exist in the product yet." No `role`,
// no `href`, no `onClick` — unambiguously non-interactive to assistive
// tech, not just visually muted (`aria-disabled` on a plain `<span>` is
// informational only; it does not make the element operable, nor should
// it — there is nothing to operate).
//
// Extracted from NavLink's own "planned" rendering (M5.1/M5.2's
// navigation-config work) so page content and navigation share one visual
// vocabulary for "coming later" rather than inventing a second one here —
// per the M5.2 workspace/empty-state requirement to reuse existing
// primitives rather than duplicate the pattern. Server Component: no
// interactivity, by design.
export function FutureAction({ label, reason, className }: FutureActionProps) {
  return (
    <span
      aria-disabled="true"
      title={reason}
      className={cn("inline-flex cursor-default items-center gap-1.5 text-muted-foreground", className)}
    >
      {label}
      <Badge size="sm">Soon</Badge>
    </span>
  );
}
