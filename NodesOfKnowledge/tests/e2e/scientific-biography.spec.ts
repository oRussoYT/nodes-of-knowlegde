import { expect, test } from "@playwright/test";

import { registerAndConfirm } from "./helpers/auth";
import {
  createBiographyPerson,
  deleteBiographyPerson,
  getSeededNarrativePerson,
  type BiographyPerson,
} from "./helpers/biography";
import { runAccessibilityScan, assertNoSeriousOrCriticalViolations } from "./helpers/accessibility";
import { attachConsoleWatcher, getDuplicateIds, hasHorizontalOverflow, setStoredTheme } from "./helpers/page-quality";

// End-to-end coverage for the M6.1 Scientific Biography read route,
// /people/[personId]. Authenticated authorized reading only.
//
// Two data sources, both existing privileged seeding paths (see
// helpers/biography.ts): disposable, per-test people-only rows via the
// service-role client, and one shared, read-only person WITH a curated
// narrative from supabase/seed.sql (person_narrative has no service_role
// write path, by the production security model). Only disposable rows are
// cleaned up; the seeded narrative person is shared and never deleted.

const created: string[] = [];

test.afterEach(async () => {
  const ids = created.splice(0);
  for (const id of ids) {
    await deleteBiographyPerson(id).catch(() => {});
  }
});

async function make(options: Parameters<typeof createBiographyPerson>[0]): Promise<BiographyPerson> {
  const person = await createBiographyPerson(options);
  created.push(person.id);
  return person;
}

test.describe("access control", () => {
  test("an unauthenticated visitor is redirected to login, never shown a biography", async ({ page }) => {
    await page.goto("/people/00000000-0000-0000-0000-000000000000");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("reading a provisional biography with a curated narrative", () => {
  test("shows identity, provisional state, the narrative, provenance, and the withheld note", async ({ page }) => {
    await registerAndConfirm(page);
    const person = await getSeededNarrativePerson();

    await page.goto(person.url);

    await expect(page.getByRole("heading", { level: 1, name: person.displayName })).toBeVisible();
    await expect(page.getByText("Provisional record")).toBeVisible();
    await expect(page.getByText(person.narrativeBody)).toBeVisible();
    // Provenance is discoverable but unobtrusive.
    await expect(page.getByRole("button", { name: /Provenance of the/i }).first()).toBeVisible();
    // Honest withholding, never a fabricated value.
    await expect(page.getByText(/not shown here/i)).toBeVisible();
  });
});

test.describe("honest incomplete states", () => {
  test("a biography with no narrative shows a dignified absence state, not filler", async ({ page }) => {
    await registerAndConfirm(page);
    const person = await make({});

    await page.goto(person.url);

    await expect(page.getByRole("heading", { level: 1, name: person.displayName })).toBeVisible();
    await expect(page.getByText("No biographical narrative yet")).toBeVisible();

    // No fabricated metric or record anywhere on the page.
    const fabricatedMetric = /\b\d[\d,]*\+?\s*(participations?|publications?|projects?|relationships?|collaborators?|records?)\b/i;
    await expect(page.getByText(fabricatedMetric)).toHaveCount(0);
    await expect(page.locator("main table, main [role='table']")).toHaveCount(0);
  });

  test("a merged or nonexistent person renders the dignified not-found state", async ({ page }) => {
    await registerAndConfirm(page);
    await page.goto("/people/00000000-0000-0000-0000-000000000000");
    await expect(page.getByText("Biography not available")).toBeVisible();
  });
});

test.describe("identity states", () => {
  test("an institutionally-verified record shows the verified state", async ({ page }) => {
    await registerAndConfirm(page);
    const person = await make({ verificationStatus: "verified_admin", sourceType: "admin_entered" });
    await page.goto(person.url);
    await expect(page.getByText("Verified — institutionally confirmed")).toBeVisible();
  });

  test("a deceased subject shows a dignified in-memoriam marker (no exact dates)", async ({ page }) => {
    await registerAndConfirm(page);
    const person = await make({ isDeceased: true });
    await page.goto(person.url);
    await expect(page.getByText("In memoriam")).toBeVisible();
  });
});

test.describe("reserved section architecture", () => {
  test("shows honest reserved locations for later engines, with no fabricated data", async ({ page }) => {
    await registerAndConfirm(page);
    const person = await make({});
    await page.goto(person.url);

    for (const heading of ["Timeline", "Participation", "Relationships", "Historical records", "Legacy"]) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }
  });
});

test.describe("browser quality and accessibility", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`reads cleanly at 375px with no console errors, duplicate ids, or overflow (${theme})`, async ({ page }) => {
      const issues = attachConsoleWatcher(page);
      await setStoredTheme(page, theme);
      await page.setViewportSize({ width: 375, height: 812 });

      await registerAndConfirm(page);
      const person = await getSeededNarrativePerson();
      await page.goto(person.url);
      await page.waitForLoadState("networkidle");

      expect(issues, issues.join("\n")).toEqual([]);

      // Exactly one h1 (the person's name).
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

      const duplicates = await getDuplicateIds(page);
      expect(duplicates, `duplicate ids: ${duplicates.join(", ")}`).toEqual([]);
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }

  test("has no serious or critical axe violations", async ({ page }) => {
    await registerAndConfirm(page);
    const person = await getSeededNarrativePerson();
    await page.goto(person.url);
    await page.waitForLoadState("networkidle");

    const violations = await runAccessibilityScan(page);
    assertNoSeriousOrCriticalViolations(violations);
  });

  test("the provenance disclosure is reachable and operable by keyboard", async ({ page }) => {
    await registerAndConfirm(page);
    // A disposable people-only subject: this test asserts the IDENTITY
    // provenance, which every person carries; no narrative is needed.
    const person = await make({});
    await page.goto(person.url);

    const trigger = page.getByRole("button", { name: /Provenance of the identity/i });
    await trigger.focus();
    await expect(trigger).toBeFocused();
    // Radix opens the tooltip on focus; its content echoes the provenance.
    await expect(page.getByText("Imported from historical records").first()).toBeVisible();
  });
});
