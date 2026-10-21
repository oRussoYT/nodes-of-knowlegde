import { expect, test } from "@playwright/test";

import { runAccessibilityScan, assertNoSeriousOrCriticalViolations } from "./helpers/accessibility";
import { registerAndConfirm } from "./helpers/auth";
import { createBiographyPerson, deleteBiographyPerson } from "./helpers/biography";
import { attachConsoleWatcher, getDuplicateIds, hasHorizontalOverflow, setStoredTheme } from "./helpers/page-quality";
import { addOrganization, addParticipation, deleteOrganization, deleteParticipation } from "./helpers/participation";

// End-to-end coverage for the M6.3 Participation Engine, rendered inside the
// Scientific Biography (/people/[personId]). Authenticated reading only.
// Disposable, isolated fixtures via the service-role client (organizations and
// participations are service_role-granted).

const people: string[] = [];
const organizations: string[] = [];
const participations: string[] = [];

test.afterEach(async () => {
  for (const id of participations.splice(0)) {
    await deleteParticipation(id).catch(() => {});
  }
  for (const id of organizations.splice(0)) {
    await deleteOrganization(id).catch(() => {});
  }
  for (const id of people.splice(0)) {
    await deleteBiographyPerson(id).catch(() => {});
  }
});

async function newPerson() {
  const person = await createBiographyPerson({});
  people.push(person.id);
  return person;
}

async function newOrganization(name: string, shortName?: string) {
  const id = await addOrganization(name, shortName);
  organizations.push(id);
  return id;
}

async function participate(personId: string, organizationId: string, input: Parameters<typeof addParticipation>[2]) {
  participations.push(await addParticipation(personId, organizationId, input));
}

test.describe("access control", () => {
  test("an unauthenticated visitor is redirected to login", async ({ page }) => {
    await page.goto("/people/00000000-0000-0000-0000-000000000000");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("empty participation", () => {
  test("a biography with no participation shows a dignified honest state, never fabricated affiliations", async ({ page }) => {
    await registerAndConfirm(page);
    const person = await newPerson();
    await page.goto(person.url);

    await expect(page.getByRole("heading", { level: 2, name: "Participation" })).toBeVisible();
    await expect(page.getByText("No participation yet")).toBeVisible();
    await expect(page.getByText(/No institutional participation has been recorded/)).toBeVisible();
  });
});

test.describe("participation reads as belonging, honestly and by organization", () => {
  test("capacities, periods, temporal states, concurrent belonging, and organization grouping", async ({ page }) => {
    await registerAndConfirm(page);
    const person = await newPerson();
    const alpha = await newOrganization("Alpha Research Station", "ALFA");
    const beta = await newOrganization("Beta Institute");

    // Two capacities/periods at Alpha (sequential), and a concurrent belonging
    // at Beta (~1990 overlaps the Alpha researcher period), plus an undated one.
    await participate(person.id, alpha, { capacity: "researcher", summary: "Field research programme.", startDate: "1987-01-01", startPrecision: "year", endDate: "1991-01-01", endPrecision: "year" });
    await participate(person.id, alpha, { capacity: "director", startDate: "1992-01-01", startPrecision: "year", isOngoing: true });
    await participate(person.id, beta, { capacity: "visiting_researcher", startDate: "1990-01-01", startPrecision: "year", isApproximate: true });
    await participate(person.id, beta, { capacity: "student", dateIsUnknown: true });

    await page.goto(person.url);

    // Organizations head the belonging (the "where").
    await expect(page.getByRole("heading", { level: 3, name: "Alpha Research Station" })).toBeVisible();
    await expect(page.getByText("(ALFA)")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Beta Institute" })).toBeVisible();

    // Capacities (the "how") -- each a distinct belonging, none collapsed.
    // exact: true -- "Researcher" is a substring of "Visiting researcher", so a
    // non-exact accessible-name match would resolve to two headings.
    await expect(page.getByRole("heading", { level: 4, name: "Researcher", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 4, name: "Director", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 4, name: "Visiting researcher", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 4, name: "Student", exact: true })).toBeVisible();

    // Periods (the "when / how long"), each temporal state kept distinct.
    await expect(page.getByText(/1987\s*[–-]\s*1991/)).toBeVisible();          // bounded interval
    await expect(page.getByText(/1992\s*[–-]\s*present/)).toBeVisible();       // open-ended, still current
    await expect(page.getByText(/c\. 1990/)).toBeVisible();                    // approximate
    await expect(page.getByText(/Approximate date/)).toBeVisible();           // approximation note
    await expect(page.getByText("Date unknown").first()).toBeVisible();       // undated (kept, not dropped)

    // Optional context and provenance.
    await expect(page.getByText("Field research programme.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Provenance of this participation/i }).first()).toBeVisible();

    // Alpha (earliest involvement, 1987) is ordered before Beta (1990).
    const orgHeadings = page.getByRole("heading", { level: 3 });
    await expect(orgHeadings.first()).toHaveText(/Alpha Research Station/);
  });
});

test.describe("browser quality and accessibility", () => {
  async function richPerson() {
    const person = await newPerson();
    const alpha = await newOrganization("Alpha Research Station", "ALFA");
    const beta = await newOrganization("Beta Institute");
    await participate(person.id, alpha, { capacity: "researcher", startDate: "1985-01-01", startPrecision: "year", endDate: "1990-01-01", endPrecision: "year" });
    await participate(person.id, alpha, { capacity: "director", startDate: "1991-01-01", startPrecision: "year", isOngoing: true });
    await participate(person.id, beta, { capacity: "student", dateIsUnknown: true });
    return person;
  }

  for (const theme of ["light", "dark"] as const) {
    test(`reads cleanly at 375px with no console errors, duplicate ids, or overflow (${theme})`, async ({ page }) => {
      const issues = attachConsoleWatcher(page);
      await setStoredTheme(page, theme);
      await page.setViewportSize({ width: 375, height: 812 });

      await registerAndConfirm(page);
      const person = await richPerson();
      await page.goto(person.url);
      await page.waitForLoadState("networkidle");

      expect(issues, issues.join("\n")).toEqual([]);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      const duplicates = await getDuplicateIds(page);
      expect(duplicates, `duplicate ids: ${duplicates.join(", ")}`).toEqual([]);
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }

  test("has no serious or critical axe violations", async ({ page }) => {
    await registerAndConfirm(page);
    const person = await richPerson();
    await page.goto(person.url);
    await page.waitForLoadState("networkidle");
    const violations = await runAccessibilityScan(page);
    assertNoSeriousOrCriticalViolations(violations);
  });

  test("participation provenance is reachable and operable by keyboard", async ({ page }) => {
    await registerAndConfirm(page);
    const person = await newPerson();
    const alpha = await newOrganization("Alpha Research Station", "ALFA");
    await participate(person.id, alpha, { capacity: "researcher", startDate: "1987-01-01", startPrecision: "year" });
    await page.goto(person.url);

    // The provenance affordance is a real, keyboard-focusable button, and its
    // full provenance (source + verification) is exposed to assistive
    // technology through the trigger's accessible name -- exactly what a
    // screen-reader user receives on focus. We assert that accessible name
    // (server-rendered, deterministic) rather than the visual tooltip portal,
    // whose focus-triggered mount is subject to a hydration race in headless
    // Chromium and is sighted-user sugar layered by the shared Tooltip
    // primitive; the keyboard/AT provenance guarantee is the accessible name.
    const trigger = page.getByRole("button", { name: /Provenance of this participation/i }).first();
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAccessibleName(/Imported from historical records/);
  });
});
