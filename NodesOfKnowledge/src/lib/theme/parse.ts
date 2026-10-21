import { THEME_COOKIE_NAME } from "./constants";
import type { Theme } from "./types";

export function isValidTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Parses a raw `document.cookie`-style string (semicolon-separated
 * "key=value" pairs) and returns the theme cookie's value, or `null` if
 * absent/invalid.
 *
 * Pure string parsing with no DOM access, so it's unit-testable without
 * jsdom (not installed yet — see M5.1 dependency boundary). The caller
 * passes `document.cookie` in the browser.
 */
export function parseThemeCookie(cookieString: string | null | undefined): Theme | null {
  if (!cookieString) return null;

  for (const pair of cookieString.split(";")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;

    const key = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();

    if (key === THEME_COOKIE_NAME && isValidTheme(value)) {
      return value;
    }
  }

  return null;
}

/**
 * Builds the string to assign to `document.cookie` to persist an explicit
 * theme choice client-side. One-year expiry, `path=/`, `SameSite=Lax` (no
 * cross-site need — same-origin preference only). No `Secure` flag
 * hardcoded, so this also behaves correctly in local `http://` development.
 *
 * No database column or Supabase call is introduced to store this — theme
 * preference is client-side only, per
 * docs/m5-application-ui-design-system.md's explicit "must not implement"
 * list.
 */
export function serializeThemeCookie(theme: Theme): string {
  const maxAgeSeconds = 60 * 60 * 24 * 365;
  return `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}
