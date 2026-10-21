import type { InputHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/ui/cn";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Optional inline label — checkboxes conventionally pair a control with
   * adjacent text, unlike the label-above pattern `Label`/`FormField` use
   * for text fields. Omit to render the bare control and compose your own
   * `<label>` (e.g. when the label needs richer markup, like the
   * terms-acceptance link on `/register`). */
  label?: ReactNode;
}

// `/register`'s terms-acceptance control today is an unstyled native
// checkbox — this is its generalized, token-styled replacement, per
// docs/design-system-architecture.md's component table. Themed via the
// native `accent-color` property (Tailwind's `accent-*` utility) rather
// than a hand-drawn custom box + checkmark icon — broadly supported in
// current browsers, keeps full native keyboard/screen-reader behavior for
// free, and needs no icon dependency.
//
// `forwardRef` per docs/design-system-architecture.md's accessibility
// requirements, forwarded to the underlying `<input>` in both the
// bare-control and wrapped-in-label branches.
//
// `shrink-0` (M5.2 fix, found during the auth-page static audit): the
// control sits in a `flex items-start` row next to its label text
// (`label`'s wrapping `<label>` below). Without `shrink-0`, a long label —
// e.g. /register's terms-acceptance text, which wraps onto several lines on
// a narrow viewport — can compress this fixed `size-4` control below its
// intended size under the flexbox layout algorithm. The hand-rolled
// checkbox this component replaced had `shrink-0` explicitly; this restores
// that safeguard at the primitive level so every consumer gets it.
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className, id, ...rest },
  ref
) {
  const control = (
    <input
      ref={ref}
      type="checkbox"
      id={id}
      className={cn(
        "size-4 shrink-0 rounded-sm border-border-default text-accent accent-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus",
        "disabled:cursor-not-allowed disabled:opacity-(--opacity-disabled)",
        className
      )}
      {...rest}
    />
  );

  if (!label) return control;

  return (
    <label htmlFor={id} className="flex items-start gap-2 text-sm text-foreground">
      {control}
      <span>{label}</span>
    </label>
  );
});
