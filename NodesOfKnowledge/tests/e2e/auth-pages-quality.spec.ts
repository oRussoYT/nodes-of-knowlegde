import { expect, test, type Page } from "@playwright/test";

import {
  attachConsoleWatcher,
  getDuplicateIds,
  hasHorizontalOverflow,
  setStoredTheme,
} from "./helpers/page-quality";
import { waitForConfirmationLink } from "./helpers/mailpit";

// Automated browser-quality pass for the five redesigned M5.2 auth pages —
// added after the static code audit (which found and fixed the duplicate
// `id="email"` on /login and the Checkbox `shrink-0` gap) to cover what
// only a real browser can confirm: actual console output, real layout
// overflow, and real keyboard focus behavior. Extends the existing suite;
// none of the assertions in login.spec.ts, register.spec.ts,
// password-reset.spec.ts, update-password.spec.ts, or protected-routes.spec.ts
// were changed or weakened.

const PUBLIC_AUTH_PAGES = ["/login", "/register", "/forgot-password", "/auth/error"] as const;

const HEADING_BY_PAGE: Record<(typeof PUBLIC_AUTH_PAGES)[number], string> = {
  "/login": "Log in",
  "/register": "Create an account",
  "/forgot-password": "Reset your password",
  "/auth/error": "This link didn't work",
};

const PRIMARY_BUTTON_BY_PAGE: Record<(typeof PUBLIC_AUTH_PAGES)[number], string | null> = {
  "/login": "Log in",
  "/register": "Create account",
  "/forgot-password": "Send reset link",
  "/auth/error": null, // No form on this page — only links.
};

for (const path of PUBLIC_AUTH_PAGES) {
  test.describe(`${path} — browser quality`, () => {
    for (const theme of ["light", "dark"] as const) {
      test(`no console errors or hydration warnings (${theme} theme)`, async ({ page }) => {
        const issues = attachConsoleWatcher(page);
        await setStoredTheme(page, theme);
        await page.goto(path);
        await page.waitForLoadState("networkidle");

        expect(issues, issues.join("\n")).toEqual([]);
      });
    }

    test("no duplicate element ids", async ({ page }) => {
      await page.goto(path);
      const duplicates = await getDuplicateIds(page);
      expect(duplicates, `duplicate ids: ${duplicates.join(", ")}`).toEqual([]);
    });

    test("no horizontal overflow at 375px width", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(path);
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });

    test("accessible heading and primary action are unchanged", async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: HEADING_BY_PAGE[path] })).toBeVisible();

      const buttonName = PRIMARY_BUTTON_BY_PAGE[path];
      if (buttonName) {
        await expect(page.getByRole("button", { name: buttonName })).toBeVisible();
      }
    });
  });
}

// /update-password requires a session for *any* content to render (an
// unauthenticated visitor is redirected to /login before this page's body
// ever runs — see protected-routes.spec.ts). The state reachable without
// the full recovery-email flow is the "Reset link required" gate (any
// signed-in account without the recovery-flow hint cookie lands there,
// exactly like update-password.spec.ts's first test) — "where authorization
// state permits" per the brief. The "Reset your password" branch already
// gets full functional coverage in update-password.spec.ts via the real
// Mailpit recovery link; re-driving that whole flow again here just for a
// console/overflow/id check isn't worth the extra runtime.
async function reachUpdatePasswordGatedState(page: Page): Promise<void> {
  const email = `e2e-quality-${Date.now()}@example.com`;
  const password = "correcthorse1";

  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();

  const confirmLink = await waitForConfirmationLink(email);
  await page.goto(confirmLink);

  await page.goto("/update-password");
  await expect(page.getByRole("heading", { name: "Reset link required" })).toBeVisible();
}

test.describe("/update-password (gated state) — browser quality", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`no console errors or hydration warnings (${theme} theme)`, async ({ page }) => {
      const issues = attachConsoleWatcher(page);
      await setStoredTheme(page, theme);
      await reachUpdatePasswordGatedState(page);

      expect(issues, issues.join("\n")).toEqual([]);
    });
  }

  test("no duplicate element ids", async ({ page }) => {
    await reachUpdatePasswordGatedState(page);
    const duplicates = await getDuplicateIds(page);
    expect(duplicates, `duplicate ids: ${duplicates.join(", ")}`).toEqual([]);
  });

  test("no horizontal overflow at 375px width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await reachUpdatePasswordGatedState(page);
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });
});

test.describe("Keyboard-visible focus", () => {
  test("the first Tab focuses the skip link, which becomes visible", async ({ page }) => {
    await page.goto("/login");

    // sr-only until focused (focus:not-sr-only) — see SkipLink.tsx. Asserting
    // both toBeFocused and toBeVisible confirms it's not just in the
    // accessibility tree but genuinely keyboard-reachable and shown.
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
  });

  test("tabbing into the email field shows a visible focus ring", async ({ page }) => {
    await page.goto("/login");

    const emailField = page.locator("#email");
    await emailField.focus();
    await expect(emailField).toBeFocused();

    const outline = await emailField.evaluate((el) => {
      const style = getComputedStyle(el);
      return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, boxShadow: style.boxShadow };
    });
    const hasVisibleIndicator =
      (outline.outlineStyle !== "none" && outline.outlineWidth !== "0px") || outline.boxShadow !== "none";
    expect(hasVisibleIndicator, JSON.stringify(outline)).toBe(true);
  });
});

test.describe("Regression: resend-confirmation form id fix", () => {
  test("clicking the resend form's own Email label focuses the resend field, not the login field", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByText("Didn't get a confirmation email?").click();

    const resendForm = page
      .locator("form")
      .filter({ has: page.getByRole("button", { name: "Resend confirmation email" }) });

    // Native <label for> behavior: clicking the label text focuses whatever
    // element its `for`/wrapping targets. Before the id fix, both this
    // label and LoginForm's own "Email" label pointed at the same
    // duplicated id="email", and a browser resolves that to the *first*
    // matching element — LoginForm's field, not this one.
    await resendForm.getByText("Email", { exact: true }).click();

    await expect(page.locator("#resend-email")).toBeFocused();
    await expect(page.locator("#email")).not.toBeFocused();
  });
});

test.describe("Regression: Checkbox shrink-0 fix", () => {
  test("the registration terms checkbox stays square at a 375px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/register");

    const checkbox = page.getByRole("checkbox");
    const box = await checkbox.boundingBox();

    expect(box).not.toBeNull();
    // Allow sub-pixel rounding; a genuinely squished control would be off
    // by several pixels, not a fraction of one.
    expect(Math.abs(box!.width - box!.height)).toBeLessThanOrEqual(1);
    // Sanity floor: catches the control being collapsed near-zero instead
    // of merely non-square.
    expect(box!.width).toBeGreaterThanOrEqual(14);
  });
});
