// Generic, reusable form field: label + input + field-level error message.
//
// Public API (label, name, error, hint, plus every native <input> prop) is
// unchanged from M4 — every existing call site (`/login`, `/register`,
// `/forgot-password`, `/update-password`) keeps working unmodified, per
// docs/m5-application-ui-design-system.md's item 2 acceptance criteria.
// Internals are refactored onto the new Label/Input/HelperText/FieldError
// sub-primitives and design tokens instead of hand-repeated Tailwind color
// utilities, per docs/design-system-architecture.md: "FormField generalizes
// ... to wrap Input/Textarea/Select/Checkbox/Radio uniformly". M5.1
// deliberately keeps FormField's own shape as "wraps a single <input>" —
// composing Textarea/Select/Checkbox/Radio through a shared field wrapper
// is real form-building work that belongs to the pages that need it
// (M5.2), not to this token/primitive milestone. Those sub-primitives are
// exported standalone today for exactly that future composition.
//
// `forwardRef`, forwarded to the underlying `<input>`, is new in M5.1 (M4's
// version had none) — purely additive, since `ref` is an optional prop no
// existing call site passes. Added per docs/design-system-architecture.md's
// accessibility requirements: "important for focus management (form-error
// scroll-to-field behavior ...)".
import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";

import { FieldError } from "./FieldError";
import { HelperText } from "./HelperText";
import { Input } from "./Input";
import { Label } from "./Label";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  hint?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, name, error, hint, id, ...inputProps },
  ref
) {
  const fieldId = id ?? name;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={fieldId}>{label}</Label>

      <Input
        ref={ref}
        id={fieldId}
        name={name}
        invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}
        {...inputProps}
      />

      {hint ? <HelperText id={hintId}>{hint}</HelperText> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
});
