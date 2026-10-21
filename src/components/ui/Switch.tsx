"use client";

import { forwardRef, useState } from "react";

import { cn } from "@/lib/ui/cn";

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** Required — a switch with no accessible name is not acceptable per
   * docs/design-system-architecture.md's accessibility requirements. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  id?: string;
  name?: string;
  className?: string;
}

// No current M4 use; likely first use is the dark-mode toggle itself, per
// docs/design-system-architecture.md's component table — that wiring is
// M5.2 shell work (no header exists yet to put it in). Built as a real
// `role="switch"` button rather than a styled native checkbox, since a
// sliding-track visual needs a shape native checkboxes can't produce
// without a hand-drawn replacement — no icon involved, just two `<span>`
// shapes (track + thumb) positioned with CSS. Both controlled
// (`checked`/`onCheckedChange`) and uncontrolled (`defaultChecked`) usage
// are supported, per docs/design-system-architecture.md's
// "Component-composition principles". Client Component: genuinely
// interactive (click + keyboard toggle, internal state when uncontrolled).
// `forwardRef` per the same accessibility requirement as every other
// interactive-element-wrapping primitive — forwarded to the visible,
// interactive `<button>`, not the form-only shadow input below.
//
// Form participation: a real, visually-hidden `<input type="checkbox">`
// mirrors the switch's state for native `<form>` submission, per the
// standard checkbox submission model — not a `type="hidden"` input whose
// `value` was toggled between the strings "on"/"off" (M5.1's original,
// incorrect implementation). A `type="hidden"` input has no `checked`
// concept at all: it always submits its `value`, so the earlier version
// literally submitted the string "off" for an unchecked switch instead of
// omitting the field — the one behavior every native checkbox/radio
// guarantees (unchecked = absent from form submission, not "checked with a
// false-ish value"). Fixed to a real `<input type="checkbox" checked={isOn}>`
// with a constant `value="on"`, exactly matching how the platform already
// serializes an unchecked checkbox: browsers exclude it from `FormData`
// entirely. This mirror input is `readOnly` (state is driven by the
// button's own click/keyboard handling, not by interacting with the input
// directly — `readOnly` is also what suppresses React's "you provided a
// `checked` prop without `onChange`" warning for a controlled input with no
// handler of its own), `tabIndex={-1}` and `aria-hidden` (it must never be
// reachable or announced as a second, redundant switch — the button is the
// only control exposed to keyboard/assistive tech), and rendered as a
// sibling of the button, not a child of it (nesting a real interactive
// `<input>` inside a `<button>` is invalid HTML content-model nesting,
// unlike the previous `type="hidden"` input, which HTML explicitly excludes
// from "interactive content").
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, defaultChecked = false, onCheckedChange, disabled, id, name, className, ...aria },
  ref
) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const isOn = isControlled ? checked : internalChecked;

  function toggle() {
    if (disabled) return;
    const next = !isOn;
    if (!isControlled) setInternalChecked(next);
    onCheckedChange?.(next);
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        role="switch"
        id={id}
        aria-checked={isOn}
        disabled={disabled}
        onClick={toggle}
        className={cn(
          "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors",
          "duration-(--duration-fast) ease-(--ease-standard)",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus",
          "disabled:cursor-not-allowed disabled:opacity-(--opacity-disabled)",
          isOn ? "bg-accent" : "bg-border-strong",
          className
        )}
        {...aria}
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-block size-4 translate-x-1 rounded-full bg-accent-foreground shadow-sm transition-transform",
            "duration-(--duration-fast) ease-(--ease-standard)",
            isOn && "translate-x-5"
          )}
        />
      </button>
      {name ? (
        <input
          type="checkbox"
          name={name}
          value="on"
          checked={isOn}
          disabled={disabled}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />
      ) : null}
    </>
  );
});
