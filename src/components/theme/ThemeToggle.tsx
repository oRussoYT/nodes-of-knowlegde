"use client";

import { useEffect, useLayoutEffect, useState } from "react";

import { Switch } from "@/components/ui/Switch";
import { applyTheme, getSystemTheme } from "@/lib/theme/apply-theme";
import type { Theme } from "@/lib/theme/types";

export interface ThemeToggleProps {
  className?: string;
}

// `useLayoutEffect` logs "does nothing on the server" when the component
// using it is also server-rendered — every "use client" component in this
// app still renders once on the server for the initial HTML (see
// ThemeScript.tsx's own comment on that same distinction). Selecting
// `useEffect` server-side and `useLayoutEffect` client-side is a small,
// well-known React idiom (not a theming library, so it doesn't reintroduce
// anything ADR-0002 rejected) that avoids that warning while still getting
// a synchronous, pre-paint correction on the client — see below.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// The one real theme-toggle control (M5.2), used by both PublicHeader and
// ProtectedHeader. Extracted from the M5.1 dev-only ThemeToggleDemo
// (src/app/dev/design-system/ThemeToggleDemo.tsx), which now wraps this
// component instead of re-implementing the same logic in two places.
//
// Hydration fix (found by the automated auth-page Playwright suite,
// tests/e2e/auth-pages-quality.spec.ts): the previous version computed
// `getStoredTheme() ?? getSystemTheme()` inside `useState`'s lazy
// initializer, gated only by `typeof window === "undefined"`. That gate is
// true during SSR, so the server always rendered `checked={false}`
// (`aria-checked="false"`) — but React re-runs that same initializer on the
// *client's first render* too, which is the render it reconciles against
// the server HTML. By then `window` exists, so the initializer immediately
// returned the visitor's *real* stored/system theme. For any visitor whose
// real preference is dark, the client's very first render already
// disagreed with the server's `aria-checked="false"` and its derived
// classes (`bg-accent`/`translate-x-5` vs `bg-border-strong`/`translate-x-1`)
// — a genuine cross-render mismatch on attributes React manages, not a
// false positive. The `suppressHydrationWarning` previously on this
// component's wrapping `<span>` didn't actually cover it either:
// `suppressHydrationWarning` only suppresses a mismatch on the exact
// element it's applied to, not on descendants — and the mismatching
// `aria-checked`/classes live on `Switch`'s internal `<button>`, a child of
// that span, several layers below where the suppression was attached.
//
// Fix: the render React uses to match against SSR output — the server
// render and the client's first render alike — now always starts from the
// same fixed, deterministic value (`"light"`, i.e. `checked={false}`),
// never from `window`, `localStorage`, or `matchMedia`. The real value is
// applied afterward, in `useIsomorphicLayoutEffect` below, which runs
// strictly *after* that hydration-matching render has already completed —
// so it can never disagree with server output; ordinary post-mount state
// updates aren't hydration mismatches, they're just re-renders. On the
// client this runs synchronously, *after* the DOM updates but *before* the
// browser paints that frame, reading `data-theme` directly off `<html>` —
// the exact attribute `ThemeScript`'s inline script (src/components/theme/ThemeScript.tsx)
// already set, synchronously, before hydration even began. Because the
// correction lands before paint, and because it reads the very same source
// ThemeScript already used, the toggle's own thumb/`aria-checked` never
// visibly shows the wrong position for a frame — there is nothing to
// flash. If `data-theme` is unset (no stored preference — a first-time
// visitor relying on the `prefers-color-scheme` CSS fallback in
// globals.css), this falls back to `getSystemTheme()`, which reads the same
// media query that CSS fallback keys off, so the toggle still matches
// what's actually on screen.
//
// This does not touch, and is not what prevents, a *page-wide* theme flash
// (ADR-0002's actual FOUC concern): every themed color on the page is
// already driven by `data-theme` via CSS, set by `ThemeScript` before any
// React code runs at all. This component has only ever controlled its own
// `Switch`'s visual state, never the page's colors.
export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>("light");

  useIsomorphicLayoutEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : current === "light" ? "light" : getSystemTheme());
  }, []);

  return (
    <Switch
      checked={theme === "dark"}
      onCheckedChange={(checked) => {
        const next: Theme = checked ? "dark" : "light";
        setTheme(next);
        applyTheme(next);
      }}
      aria-label="Dark mode"
      className={className}
    />
  );
}
