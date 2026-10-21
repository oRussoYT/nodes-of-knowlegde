import { expect, test } from "@playwright/test";

import { assertNoSeriousOrCriticalViolations, runAccessibilityScan } from "./helpers/accessibility";
import { registerAndConfirm } from "./helpers/auth";
import { attachConsoleWatcher, getDuplicateIds, hasHorizontalOverflow, setStoredTheme } from "./helpers/page-quality";

// End-to-end coverage for the M6 System Exhibition dev route
// (/dev/exhibition) and the seeded fictional world it links to
// (supabase/seeds/m6_exhibition.sql; see docs/m6-system-exhibition.md).
//
// The exhibition page itself is guarded only by NODE_ENV (not by auth), so
// it is reachable without signing in during development. The person,
// institution, and contribution pages it links to are the product's normal
// authenticated reading surfaces, so those tests register a user first.
//
// Production exclusion (a real 404 when NODE_ENV !== "development") is
// enforced by isDevOnlyRouteBlocked() + notFound() and unit-tested in
// tests/unit/dev-exhibition.test.ts; it cannot be exercised against this
// suite's development web server. The reachable-without-auth test below
// documents that this is a standalone dev route, not a protected one.

const IDS = {
  helena: "e6110000-0000-4000-8000-000000000001",
  anaYara: "e6110000-0000-4000-8000-000000000003",
  ihfa: "e6220000-0000-4000-8000-000000000001",
  aet: "e6220000-0000-4000-8000-000000000003",
  dataset: "e6660000-0000-4000-8000-000000000001",
};

async function assertPageQuality(page: import("@playwright/test").Page, issues: string[]) {
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  expect(await getDuplicateIds(page)).toEqual([]);
  expect(await hasHorizontalOverflow(page)).toBe(false);
  const violations = await runAccessibilityScan(page);
  assertNoSeriousOrCriticalViolations(violations);
  expect(issues, issues.join("\n")).toEqual([]);
}

test.describe("the /dev/exhibition doorway", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`opens and lists the seeded world, with no quality regressions (${theme})`, async ({ page }) => {
      test.slow();
      const issues = attachConsoleWatcher(page);
      await setStoredTheme(page, theme);
      await page.setViewportSize({ width: 375, height: 812 });

      await page.goto("/dev/exhibition");

      await expect(page.getByRole("heading", { level: 1, name: /System Exhibition/ })).toBeVisible();
      await expect(page.getByText(/every record linked from this page is fictional/i)).toBeVisible();
      // Direct links to the principal seeded entities are present.
      await expect(page.getByRole("link", { name: "Dr. Helena Arvoredo" }).first()).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Instituto de História da Floresta Amazônica/ }).first(),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Long-term canopy-phenology dataset/ }).first(),
      ).toBeVisible();

      await assertPageQuality(page, issues);
    });
  }

  test("is reachable without authentication (a standalone dev route, not a protected one)", async ({ page }) => {
    await page.goto("/dev/exhibition");
    await expect(page).toHaveURL(/\/dev\/exhibition$/);
    await expect(page.getByRole("heading", { level: 1, name: /System Exhibition/ })).toBeVisible();
  });
});

test.describe("direct links reach the seeded reading surfaces", () => {
  test("the reading surfaces require authentication", async ({ page }) => {
    await page.goto(`/people/${IDS.helena}`);
    await expect(page).toHaveURL(/\/login/);
  });

  for (const theme of ["light", "dark"] as const) {
    test(`the principal person shows Biography, Timeline, Participation, Relationships (${theme})`, async ({ page }) => {
      test.slow();
      const issues = attachConsoleWatcher(page);
      await setStoredTheme(page, theme);
      await page.setViewportSize({ width: 375, height: 812 });
      await registerAndConfirm(page);

      await page.goto(`/people/${IDS.helena}`);

      await expect(page.getByRole("heading", { level: 1, name: /Helena Arvoredo/ })).toBeVisible();
      await expect(page.getByText(/fictional tropical-forest ecologist/i)).toBeVisible();
      await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: "Participation", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Relationships" })).toBeVisible();

      await assertPageQuality(page, issues);
    });
  }

  test("the principal institution shows identity, narrative, timeline, and participation", async ({ page }) => {
    test.slow();
    const issues = attachConsoleWatcher(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await registerAndConfirm(page);

    await page.goto(`/institutions/${IDS.ihfa}`);

    await expect(
      page.getByRole("heading", { level: 1, name: /Instituto de História da Floresta Amazônica/ }),
    ).toBeVisible();
    await expect(page.getByText(/fictional research institute/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
    // Institution-side participation projection: a seeded participant is shown.
    await expect(page.getByText(/Beatriz Salgado/).first()).toBeVisible();

    await assertPageQuality(page, issues);
  });

  test("a contribution page shows person and institution contributors", async ({ page }) => {
    test.slow();
    const issues = attachConsoleWatcher(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await registerAndConfirm(page);

    await page.goto(`/contributions/${IDS.dataset}`);

    await expect(
      page.getByRole("heading", { level: 1, name: /Long-term canopy-phenology dataset/ }),
    ).toBeVisible();
    await expect(page.getByText(/Helena Arvoredo/).first()).toBeVisible();
    await expect(page.getByText(/Instituto de História da Floresta Amazônica/).first()).toBeVisible();

    await assertPageQuality(page, issues);
  });
});

test.describe("empty and disputed states resolve honestly", () => {
  test("a person with no narrative and a disputed relationship", async ({ page }) => {
    test.slow();
    const issues = attachConsoleWatcher(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await registerAndConfirm(page);

    await page.goto(`/people/${IDS.anaYara}`);

    await expect(page.getByRole("heading", { level: 1, name: /Ana Yara/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Relationships" })).toBeVisible();
    // The disputed field partnership surfaces its contested state in the
    // provenance affordance's accessible name — the deterministic source of
    // record (the visible tooltip is an enhancement shown only on hover/focus).
    await expect(
      page.getByRole("button", { name: /Provenance of the relationship with .*Disputed/i }),
    ).toBeVisible();

    await assertPageQuality(page, issues);
  });

  test("an institution with an incomplete history", async ({ page }) => {
    const issues = attachConsoleWatcher(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await registerAndConfirm(page);

    await page.goto(`/institutions/${IDS.aet}`);

    await expect(
      page.getByRole("heading", { level: 1, name: /Arquivo de Ecologia Tropical/ }),
    ).toBeVisible();
    await expect(page.getByText(/now-closed archive/i)).toBeVisible();

    await assertPageQuality(page, issues);
  });
});
