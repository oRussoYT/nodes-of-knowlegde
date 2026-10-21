import { THEME_COOKIE_NAME, THEME_STORAGE_KEY } from "./constants";

/**
 * Generates the literal source of the blocking, synchronous inline script
 * that sets `data-theme` on `<html>` before first paint — the mechanism
 * that prevents a flash of incorrectly-themed content, per
 * docs/decisions/0002-theming-and-server-client-theme-handling.md.
 *
 * Returned as a plain string (not JSX) so the logic itself is unit-testable
 * as pure string-generation, and separately exercisable at runtime via
 * `new Function(...)` against stub `window`/`document` objects (see
 * tests/unit/theme-inline-script.test.ts) — this gives real behavioral
 * coverage of the script's logic without needing jsdom.
 *
 * Rendered via `ThemeScript` (src/components/theme/ThemeScript.tsx) using
 * `dangerouslySetInnerHTML` — the only correct way to emit a literal,
 * synchronous `<script>` from React; it must run before React hydrates,
 * not after, which rules out a `"use client"` component with a
 * `useEffect`.
 *
 * Behavior:
 * 1. Read `localStorage[THEME_STORAGE_KEY]`.
 * 2. If absent/invalid, fall back to the theme cookie (kept in sync with
 *    localStorage by `applyTheme` — see apply-theme.ts — read here only as
 *    a secondary source, e.g. if localStorage was cleared but the cookie
 *    survives).
 * 3. If a valid theme was found, set `data-theme` on `<html>`.
 * 4. If nothing was found, leave `data-theme` unset entirely — the
 *    `prefers-color-scheme` fallback block in globals.css takes over,
 *    matching pre-M5.1 behavior exactly for a first-time visitor.
 * 5. Any thrown error (storage disabled, private browsing) is swallowed —
 *    this script must never break page render.
 */
export function getThemeInitScript(): string {
  const storageKey = JSON.stringify(THEME_STORAGE_KEY);
  // Cookie name is a fixed, known-safe identifier (see constants.ts), so it
  // is safe to interpolate directly into the regular expression source.
  const cookiePattern = `(?:^|; )${THEME_COOKIE_NAME}=(light|dark)(?:;|$)`;

  return (
    "(function(){" +
    "try{" +
    `var k=${storageKey};` +
    "var s=window.localStorage.getItem(k);" +
    'var t=(s==="light"||s==="dark")?s:null;' +
    "if(!t){" +
    `var m=document.cookie.match(/${cookiePattern}/);` +
    "t=m?m[1]:null;" +
    "}" +
    'if(t==="light"||t==="dark"){' +
    'document.documentElement.setAttribute("data-theme",t);' +
    "}" +
    "}catch(e){}" +
    "})();"
  );
}
