// Shared visual chrome for every native form control (Input, Textarea,
// Select) — one source of truth so they stay visually identical, matching
// FormField's existing (M4) input styling, now expressed on tokens instead
// of raw Tailwind color utilities. Not exported from the package's public
// surface via an index — imported directly by the handful of components
// that need it.
//
// Border/ring color is deliberately NOT part of the shared base string —
// `fieldControlBorderClasses(invalid)` always returns exactly one
// border/ring-color variant, never both at once. Without a dependency like
// `tailwind-merge` (not installed — this project adds no dependency where
// a few lines already do the job, per the same reasoning
// docs/decisions/0002-...md gives for not adopting `next-themes`), having
// both the default and invalid ring-color utilities present on the same
// element at once would leave the winner decided by Tailwind's generated
// stylesheet order rather than by application logic — exactly the bug
// class `tailwind-merge` exists to prevent. Keeping the two variants
// mutually exclusive at the call site sidesteps that risk entirely.
export const fieldControlBaseClasses =
  "w-full rounded-md bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors duration-(--duration-fast) ease-(--ease-standard) placeholder:text-subtle-foreground focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-(--opacity-disabled)";

export function fieldControlBorderClasses(invalid: boolean | undefined): string {
  return invalid
    ? "border border-destructive focus-visible:border-destructive focus-visible:ring-destructive"
    : "border border-border-default focus-visible:border-border-focus focus-visible:ring-border-focus";
}
