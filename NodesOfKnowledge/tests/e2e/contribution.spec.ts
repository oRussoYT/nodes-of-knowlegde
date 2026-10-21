import { expect, test } from "@playwright/test";

import { runAccessibilityScan, assertNoSeriousOrCriticalViolations } from "./helpers/accessibility";
import { registerAndConfirm } from "./helpers/auth";
import { createBiographyPerson, deleteBiographyPerson } from "./helpers/biography";
import {
  addContributionEvent,
  addContributionNarrative,
  addOrganizationContribution,
  addPersonContribution,
  createContribution,
  deleteContribution,
} from "./helpers/contribution";
import { createInstitution, deleteInstitution } from "./helpers/institution";
import { attachConsoleWatcher, getDuplicateIds, hasHorizontalOverflow, setStoredTheme } from "./helpers/page-quality";
import { addParticipation } from "./helpers/participation";
import { deleteEvent } from "./helpers/timeline";

// End-to-end coverage for the M6.6 Contribution Engine
// (/contributions/[contributionId] plus the person- and institution-page
// projections). Authenticated reading only. Disposable, isolated fixtures via
// the service-role client. Deleting a contribution cascades its attributions,
// narrative, and event projections; canonical events and people/institutions
// are deleted explicitly.

const contributions: string[] = [];
const people: string[] = [];
const institutions: string[] = [];
const events: string[] = [];

test.afterEach(async () => {
  for (const id of events.splice(0)) await deleteEvent(id).catch(() => {});
  for (const id of contributions.splice(0)) await deleteContribution(id).catch(() => {});
  for (const id of institutions.splice(0)) await deleteInstitution(id).catch(() => {});
  for (const id of people.splice(0)) await deleteBiographyPerson(id).catch(() => {});
});

async function newContribution(input: Parameters<typeof createContribution>[0]) {
  const c = await createContribution(input);
  contributions.push(c.id);
  return c;
}
async function newPerson() {
  const person = await createBiographyPerson({});
  people.push(person.id);
  return person;
}
async function newInstitution(input: Parameters<typeof createInstitution>[0]) {
  const inst = await createInstitution(input);
  institutions.push(inst.id);
  return inst;
}
async function projectEvent(contributionId: string, input: Parameters<typeof addContributionEvent>[1]) {
  const id = await addContributionEvent(contributionId, input);
  events.push(id);
  return id;
}

test.describe("access control", () => {
  test("an unauthenticated visitor is redirected to login", async ({ page }) => {
    await page.goto("/contributions/00000000-0000-0000-0000-000000000000");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("a contribution reads as a historical object", () => {
  test("identity, overview, contributors, institutional context, a projected event, and honest absences", async ({ page }) => {
    await registerAndConfirm(page);
    const person = await newPerson();
    const inst = await newInstitution({ name: "Alpha Institute", type: "research_institute" });
    const c = await newContribution({
      title: "Establishment of long-term monitoring",
      kind: "long_term_monitoring",
      description: "A decades-long monitoring programme.",
      startDate: "1980-01-01",
      startPrecision: "year",
      isOngoing: true,
      place: "Amazonas, Brazil",
    });
    await addContributionNarrative(c.id, { kind: "overview", body: "It monitored dynamics over decades." });
    await addPersonContribution(c.id, person.id, { capacity: "field_observation", note: "Led the field observations." });
    await addOrganizationContribution(c.id, inst.id, { capacity: "funding", note: "Funded the programme." });
    await projectEvent(c.id, { kind: "other", title: "Programme announced", startDate: "1980-01-01" });

    await page.goto(c.url);

    // Identity: one clear h1 (the title), kind + own scope + place.
    await expect(page.getByRole("heading", { level: 1, name: c.title })).toBeVisible();
    await expect(page.getByText(/Long-term monitoring · 1980\s*[–-]\s*present · Amazonas, Brazil/)).toBeVisible();

    // Overview (curated narrative, separate from evidence).
    await expect(page.getByRole("heading", { level: 2, name: "Overview" })).toBeVisible();
    await expect(page.getByText("It monitored dynamics over decades.")).toBeVisible();

    // Contributors (person, by capacity) with a discovery link.
    await expect(page.getByRole("heading", { level: 2, name: "Contributors" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Field observation", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 4, name: person.displayName, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: person.displayName })).toBeVisible();

    // Institutional context (funder is an attributed institutional contributor).
    await expect(page.getByRole("heading", { level: 2, name: "Institutional context" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Funding", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: inst.name })).toBeVisible();

    // A projected canonical Event.
    await expect(page.getByRole("heading", { level: 2, name: "Timeline" })).toBeVisible();
    await expect(page.getByText("Programme announced")).toBeVisible();

    // Honest deferred/reserved surfaces and honest narrative absences.
    await expect(page.getByRole("heading", { level: 2, name: "Records" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Consequences" })).toBeVisible();
    await expect(page.getByText("Historical significance has not yet been recorded")).toBeVisible();

    // Provenance discoverable, and deterministic in its accessible name.
    await expect(page.getByRole("button", { name: /Provenance of this contribution record/i })).toBeVisible();
  });

  test("a collective contribution is recorded without a fabricated person", async ({ page }) => {
    await registerAndConfirm(page);
    const community = await newInstitution({ name: "Community Association", type: "community_organization" });
    const c = await newContribution({ title: "Community stewardship practice", kind: "community_governance", startDate: "1990-01-01", startPrecision: "year" });
    await addOrganizationContribution(c.id, community.id, { capacity: "community_governance" });

    await page.goto(c.url);
    await expect(page.getByRole("heading", { level: 1, name: c.title })).toBeVisible();
    await expect(page.getByText("Contributors are not individually recorded")).toBeVisible();
    await expect(page.getByRole("link", { name: community.name })).toBeVisible();
  });

  test("temporal honesty: an undated contribution shows an honest unknown scope, never a fabricated date", async ({ page }) => {
    await registerAndConfirm(page);
    const c = await newContribution({ title: "Field knowledge of a region", kind: "field_knowledge", dateIsUnknown: true });
    await page.goto(c.url);
    await expect(page.getByRole("heading", { level: 1, name: c.title })).toBeVisible();
    await expect(page.getByText("No account recorded yet")).toBeVisible();
    await expect(page.getByText("Contributors are not individually recorded")).toBeVisible();
  });
});

test.describe("one canonical contribution is consistent across every surface", () => {
  test("the same contribution appears on the person page, the institution page, and its own page, by projection", async ({ page }) => {
    await registerAndConfirm(page);
    const person = await newPerson();
    const inst = await newInstitution({ name: "Beta Institute", type: "research_institute" });
    const c = await newContribution({ title: "A method for measuring canopy structure", kind: "method_or_protocol", startDate: "1985-01-01", startPrecision: "year" });
    await addPersonContribution(c.id, person.id, { capacity: "protocol_development" });
    await addOrganizationContribution(c.id, inst.id, { capacity: "institutional_support" });

    // Person page: the contribution appears under Scientific contributions and links to its page.
    await page.goto(person.url);
    await expect(page.getByRole("heading", { level: 2, name: "Scientific contributions" })).toBeVisible();
    const personLink = page.getByRole("link", { name: c.title });
    await expect(personLink).toBeVisible();
    await personLink.click();
    await expect(page).toHaveURL(new RegExp(`/contributions/${c.id}`));
    await expect(page.getByRole("heading", { level: 1, name: c.title })).toBeVisible();

    // Institution page: the SAME contribution appears from the institution's perspective.
    await page.goto(inst.url);
    await expect(page.getByRole("heading", { level: 2, name: "Scientific contributions" })).toBeVisible();
    await expect(page.getByRole("link", { name: c.title })).toBeVisible();
  });
});

test.describe("contribution is never inferred", () => {
  test("participation does not create a contribution on the person page", async ({ page }) => {
    await registerAndConfirm(page);
    const person = await newPerson();
    const inst = await newInstitution({ name: "Gamma Institute", type: "research_institute" });
    await addParticipation(person.id, inst.id, { capacity: "researcher", startDate: "1980-01-01", startPrecision: "year" });

    await page.goto(person.url);
    // Participation is present, but Scientific contributions stays an honest empty state.
    await expect(page.getByRole("heading", { level: 2, name: "Participation" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Scientific contributions" })).toBeVisible();
    await expect(page.getByText("No contributions recorded yet")).toBeVisible();
  });

  test("affiliation does not create an institutional contribution on the institution page", async ({ page }) => {
    await registerAndConfirm(page);
    const person = await newPerson();
    const inst = await newInstitution({ name: "Delta Institute", type: "research_institute" });
    await addParticipation(person.id, inst.id, { capacity: "researcher", startDate: "1980-01-01", startPrecision: "year" });

    await page.goto(inst.url);
    await expect(page.getByRole("heading", { level: 2, name: "People and participation" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Scientific contributions" })).toBeVisible();
    await expect(page.getByText("No contributions recorded yet")).toBeVisible();
  });
});

test.describe("browser quality and accessibility", () => {
  async function richContribution() {
    const person = await newPerson();
    const inst = await newInstitution({ name: "Epsilon Institute", type: "research_institute" });
    const c = await newContribution({
      title: "Long-term data stewardship",
      kind: "data_stewardship",
      description: "Curated a dataset across decades.",
      startDate: "1975-01-01",
      startPrecision: "year",
      place: "Somewhere",
    });
    await addContributionNarrative(c.id, { kind: "overview", body: "A dataset kept usable over time." });
    await addContributionNarrative(c.id, { kind: "significance", body: "It made later analysis possible." });
    await addPersonContribution(c.id, person.id, { capacity: "data_stewardship", note: "Maintained the dataset." });
    await addOrganizationContribution(c.id, inst.id, { capacity: "institutional_support" });
    await projectEvent(c.id, { kind: "other", title: "Dataset opened", startDate: "1975-01-01" });
    return c;
  }

  for (const theme of ["light", "dark"] as const) {
    test(`reads cleanly at 375px with no console errors, duplicate ids, or overflow (${theme})`, async ({ page }) => {
      // test.slow(): this navigates a FRESH /contributions route whose first hit
      // triggers on-demand Turbopack route/chunk compilation on the dev server
      // (proven via trace TTFB analysis; see the M6.6 engineering report), plus
      // register/confirm + rich setup + axe-free full render. The cost is
      // environmental dev compilation, not application code; the budget is
      // widened without weakening any assertion.
      test.slow();
      const issues = attachConsoleWatcher(page);
      await setStoredTheme(page, theme);
      await page.setViewportSize({ width: 375, height: 812 });

      await registerAndConfirm(page);
      const c = await richContribution();
      await page.goto(c.url);
      await page.waitForLoadState("networkidle");

      expect(issues, issues.join("\n")).toEqual([]);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      const duplicates = await getDuplicateIds(page);
      expect(duplicates, `duplicate ids: ${duplicates.join(", ")}`).toEqual([]);
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }

  test("has no serious or critical axe violations", async ({ page }) => {
    // test.slow(): fresh-route first-hit Turbopack compilation + axe scan (see above).
    test.slow();
    await registerAndConfirm(page);
    const c = await richContribution();
    await page.goto(c.url);
    await page.waitForLoadState("networkidle");
    const violations = await runAccessibilityScan(page);
    assertNoSeriousOrCriticalViolations(violations);
  });

  test("contribution provenance is reachable by keyboard and exposes provenance in its accessible name", async ({ page }) => {
    await registerAndConfirm(page);
    const c = await newContribution({ title: "A conceptual contribution", kind: "conceptual_contribution", startDate: "1980-01-01", startPrecision: "year" });
    await page.goto(c.url);

    const trigger = page.getByRole("button", { name: /Provenance of this contribution record/i });
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAccessibleName(/Imported from historical records/);
  });
});
