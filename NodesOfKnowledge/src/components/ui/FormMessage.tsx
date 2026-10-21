// A single, restrained banner style used for error, success, and neutral
// informational states across every auth form, so the visual language
// stays consistent without needing a full design system. "info" is for
// states that are neither a failure nor a completion — e.g. "please log in
// again" (src/app/login/page.tsx).
//
// Tone set is widened from M4's error/success/info to also accept
// warning/neutral, per docs/design-system-architecture.md's "Component
// variants" ("Tone: neutral/success/warning/danger/info ... extends M4's
// existing FormMessage tone prop"). This is additive — every existing call
// site passes one of the original three, so nothing breaks. Internals now
// render from the shared `--color-tone-*` tokens (globals.css) instead of
// hand-repeated Tailwind color utilities, matching the same `Alert`
// component uses (src/components/ui/Alert.tsx) — the two are intentionally
// styled from the same tone vocabulary.
export type FormMessageTone = "error" | "success" | "info" | "warning" | "neutral";

interface FormMessageProps {
  tone: FormMessageTone;
  children: React.ReactNode;
}

const TONE_CLASSES: Record<FormMessageTone, string> = {
  error: "border-tone-danger-border bg-tone-danger-bg text-tone-danger-fg",
  success: "border-tone-success-border bg-tone-success-bg text-tone-success-fg",
  info: "border-tone-info-border bg-tone-info-bg text-tone-info-fg",
  warning: "border-tone-warning-border bg-tone-warning-bg text-tone-warning-fg",
  neutral: "border-tone-neutral-border bg-tone-neutral-bg text-tone-neutral-fg",
};

export function FormMessage({ tone, children }: FormMessageProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-md border px-4 py-3 text-sm ${TONE_CLASSES[tone]}`}
    >
      {children}
    </div>
  );
}
