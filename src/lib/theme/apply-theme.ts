"use client";

import { THEME_STORAGE_KEY } from "./constants";
import { serializeThemeCookie } from "./parse";
import type { Theme } from "./types";

// Client-only module — every export here touches `window`/`document` and
// must never be called during server rendering. Not wired into any real
// page or shell in M5.1 (no header/toggle exists yet — see the M5.1 scope
// note in the final report); exported now so the future theme-toggle
// control has a ready, already-reasoned-about function to call instead of
// reinventing this logic, and so the internal dev-only verification route
// (M5.1) can exercise real theme switching.

/**
 * Applies a theme immediately (no reload) and persists the explicit choice
 * to localStorage + a cookie, per ADR-0002. No database column or Supabase
 * call — client-side persistence only.
 */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.cookie = serializeThemeCookie(theme);
  } catch {
    // Storage can throw (private browsing / disabled storage). The
    // in-memory data-theme attribute change above still applies for this
    // page view even if persistence silently fails.
  }
}

/** Reads the visitor's OS-level color-scheme preference. */
export function getSystemTheme(): Theme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Reads the explicitly-stored preference, if any (does not fall back to system). */
export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}
