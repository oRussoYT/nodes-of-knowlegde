// Shared helpers for the auth-page automated browser-quality pass
// (tests/e2e/auth-pages-quality.spec.ts). Kept separate from
// helpers/mailpit.ts, which is about email flows, not page-quality
// assertions — same "one concern per helper file" convention.

import type { Page } from "@playwright/test";

import { THEME_STORAGE_KEY } from "../../../src/lib/theme/constants";

/**
 * Starts collecting browser console errors and uncaught page errors for
 * `page`. Call this *before* `page.goto(...)` so nothing during initial
 * load/hydration is missed. React logs hydration mismatches via
 * `console.error` in both dev and production builds, so filtering on
 * `type() === "error"` — with no further pattern-matching/allowlisting —
 * is the most direct, least-assumption-laden way to catch both a real
 * hydration warning and any other runtime error the redesigned markup
 * might cause.
 */
export function attachConsoleWatcher(page: Page): string[] {
  const issues: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      issues.push(`console.error: ${message.text()}`);
    }
  });

  page.on("pageerror", (error) => {
    issues.push(`pageerror: ${error.message}`);
  });

  return issues;
}

/** Every `id` present more than once in the current document. Empty means none. */
export async function getDuplicateIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const counts = new Map<string, number>();
    document.querySelectorAll("[id]").forEach((el) => {
      const id = el.id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    });
    return [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
  });
}

/** Whether the page overflows horizontally at its current viewport width. */
export async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

/**
 * Sets the persisted theme preference *before* any navigation on this page,
 * via `localStorage` — the same mechanism `src/lib/theme/apply-theme.ts`
 * and the anti-FOUC inline script (`ThemeScript`) read from, so this
 * exercises the real theme-selection path rather than forcing
 * `data-theme` on after the fact. Must be called before `page.goto(...)`.
 */
export async function setStoredTheme(page: Page, theme: "light" | "dark"): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: THEME_STORAGE_KEY, value: theme },
  );
}
