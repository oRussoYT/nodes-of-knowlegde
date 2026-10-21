import { expect, test } from "@playwright/test";

import { assertNoSeriousOrCriticalViolations, runAccessibilityScan } from "./helpers/accessibility";
import { registerAndConfirm } from "./helpers/auth";
import { attachConsoleWatcher, getDuplicateIds, hasHorizontalOverflow, setStoredTheme } from "./helpers/page-quality";

// End-to-end coverage for the production reading experience: the public
// entrance, the authenticated Explore hub, and the People / Institutions /
// Contributions directories that let a first-time reader reach every detail
// page BY NAME — no UUID typed, no hidden URL. Exercises the seeded world
// (supabase/seeds/m6_exhibition.sql) that a local `db reset` provides.

async function assertPageQuality(page: import("@playwright/test").Page, issues: string[]) {
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  expect(await getDuplicateIds(page)).toEqual([]);
  expect(await hasHorizontalOverflow(page)).toBe(false);
  const violations = await runAccessibilityScan(page);
  assertNoSeriousOrCriticalViolations(violations);
  expect(issues, issues.join("\n")).toEqual([]);
}

test.describe("the public entrance", () => {
  test("invites the visitor to read, with entrance actions", async ({ page }) => {
    const issues = attachConsoleWatcher(page);
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto("/");

    await expect(page.getByRole("link", { name: "Create an account to read" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(page.getByText(/a reading record of scientific lives/i)).toBeVisible();

    await assertPageQuality(page, issues);
  });
});

test.describe("reading routes require authentication", () => {
  for (const path of ["/explore", "/people", "/institutions", "/contributions"]) {
    test(`an unauthenticated visitor to ${path} is redirected to login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test.describe("a first-time reader browses by name (no UUIDs)", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`Explore -> People -> a scientific life (${theme})`, async ({ page }) => {
      test.slow();
      const issues = attachConsoleWatcher(page);
      await setStoredTheme(page, theme);
      await page.setViewportSize({ width: 375, height: 812 });
      await registerAndConfirm(page);

      await page.goto("/explore");
      await expect(page.getByRole("heading", { level: 1, name: /Explore/ })).toBeVisible();

      // Into the People directory, then to a person by name.
      await page.getByRole("link", { name: "People", exact: true }).first().click();
      await expect(page).toHaveURL(/\/people$/);
      await expect(page.getByRole("heading", { level: 1, name: /People/ })).toBeVisible();

      await page.getByRole("link", { name: /Helena Arvoredo/ }).click();
      await expect(page).toHaveURL(/\/people\/[0-9a-f-]+$/);
      await expect(page.getByRole("heading", { level: 1, name: /Helena Arvoredo/ })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: "Participation", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Relationships" })).toBeVisible();

      await assertPageQuality(page, issues);
    });
  }

  test("the Institutions directory reaches an institution by name", async ({ page }) => {
    test.slow();
    const issues = attachConsoleWatcher(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await registerAndConfirm(page);

    await page.goto("/institutions");
    await expect(page.getByRole("heading", { level: 1, name: /Institutions/ })).toBeVisible();

    await page.getByRole("link", { name: /Instituto de História da Floresta Amazônica/ }).first().click();
    await expect(page).toHaveURL(/\/institutions\/[0-9a-f-]+$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Instituto de História da Floresta Amazônica/ }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();

    await assertPageQuality(page, issues);
  });

  test("the Contributions directory reaches a contribution by name", async ({ page }) => {
    test.slow();
    const issues = attachConsoleWatcher(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await registerAndConfirm(page);

    await page.goto("/contributions");
    await expect(page.getByRole("heading", { level: 1, name: /Contributions/ })).toBeVisible();

    await page.getByRole("link", { name: /Long-term canopy-phenology dataset/ }).first().click();
    await expect(page).toHaveURL(/\/contributions\/[0-9a-f-]+$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Long-term canopy-phenology dataset/ }),
    ).toBeVisible();

    await assertPageQuality(page, issues);
  });

  test("the authenticated nav exposes the reading directories on every page", async ({ page }) => {
    await registerAndConfirm(page);
    // /account has no reading hub of its own, so these links come from the nav.
    await page.goto("/account");
    for (const name of ["Explore", "People", "Institutions", "Contributions"]) {
      await expect(page.getByRole("link", { name, exact: true }).first()).toBeVisible();
    }
  });
});
