import { expect, test } from "@playwright/test";

import { runAccessibilityScan, assertNoSeriousOrCriticalViolations } from "./helpers/accessibility";
import { registerAndConfirm } from "./helpers/auth";
import { createBiographyPerson, deleteBiographyPerson } from "./helpers/biography";
import {
  addExternalIdentifier,
  addNarrativeFacet,
  addOrganizationEvent,
  addOrganizationName,
  createInstitution,
  deleteInstitution,
} from "./helpers/institution";
import { attachConsoleWatcher, getDuplicateIds, hasHorizontalOverflow, setStoredTheme } from "./helpers/page-quality";
import { addParticipation } from "./helpers/participation";
import { deleteEvent } from "./helpers/timeline";

// End-to-end coverage for the M6.5 Institution Engine (/institutions/[organizationId]).
// Authenticated reading only. Disposable, isolated fixtures via the service-role
// client. Deleting an institution cascades its names, identifiers, narrative,
// event projections, and participations; canonical events are deleted
// explicitly (they are projected, not owned).

const institutions: string[] = [];
const people: string[] = [];
const events: string[] = [];

test.afterEach(async () => {
  for (const id of events.splice(0)) await deleteEvent(id).catch(() => {});
  for (const id of institutions.splice(0)) await deleteInstitution(id).catch(() => {});
  for (const id of people.splice(0)) await deleteBiographyPerson(id).catch(() => {});
});

async function newInstitution(input: Parameters<typeof createInstitution>[0]) {
  const inst = await createInstitution(input);
  institutions.push(inst.id);
  return inst;
}
async function newPerson() {
  const person = await createBiographyPerson({});
  people.push(person.id);
  return person;
}
async function projectEvent(orgId: string, input: Parameters<typeof addOrganizationEvent>[1]) {
  const id = await addOrganizationEvent(orgId, input);
  events.push(id);
  return id;
}

test.describe("access control", () => {
  test("an unauthenticated visitor is redirected to login", async ({ page }) => {
    await page.goto("/institutions/00000000-0000-0000-0000-000000000000");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("an institution reads as a historical actor", () => {
  test("identity, introduction, names, timeline, people, reserved surfaces, and external identifiers", async ({ page }) => {
    await registerAndConfirm(page);
    const inst = await newInstitution({
      name: "Alpha Field Station",
      shortName: "AFS",
      type: "field_station",
      status: "active",
      foundingDate: "1979-01-01",
      foundingPrecision: "year",
      foundingIsApproximate: true,
      location: "Amazonas, Brazil",
      website: "https://example.test",
    });
    await addOrganizationName(inst.id, { name: "Alpha Research Camp", nameType: "former", startDate: "1979-01-01", endDate: "1990-01-01" });
    await addExternalIdentifier(inst.id, { scheme: "ror", value: "https://ror.org/01abc23de" });
    await addNarrativeFacet(inst.id, { kind: "introduction", body: "Founded to study tropical-forest fragmentation." });
    await projectEvent(inst.id, { kind: "site_established", title: "Station established", startDate: "1979-01-01" });
    const person = await newPerson();
    await addParticipation(person.id, inst.id, { capacity: "researcher", startDate: "1980-01-01", startPrecision: "year" });

    await page.goto(inst.url);

    // Identity header: one clear h1, type + historical status + operating period.
    await expect(page.getByRole("heading", { level: 1, name: inst.name })).toBeVisible();
    await expect(page.getByText(/Field station · Active/)).toBeVisible();
    await expect(page.getByText(/c\. 1979\s*[–-]\s*present/)).toBeVisible();
    await expect(page.getByText(/External identifiers: ROR/)).toBeVisible();

    // Introduction (curated narrative).
    await expect(page.getByRole("heading", { level: 2, name: "Introduction" })).toBeVisible();
    await expect(page.getByText("Founded to study tropical-forest fragmentation.")).toBeVisible();

    // Historical names (not disposable synonyms).
    await expect(page.getByRole("heading", { level: 2, name: "Names" })).toBeVisible();
    await expect(page.getByText("Alpha Research Camp")).toBeVisible();

    // Institution timeline (projected canonical Event).
    await expect(page.getByRole("heading", { level: 2, name: "Timeline" })).toBeVisible();
    await expect(page.getByText("Station established")).toBeVisible();

    // People and participation (projected from the institution's perspective).
    // Scoped to the "People and participation" region: the M8.4 continuity
    // section renders the same capacity label as an h3 ("Researcher") in a
    // different region, so the capacity heading and the participant heading are
    // asserted inside their own section.
    const participation = page.locator('section[aria-labelledby="participation-heading"]');
    await expect(page.getByRole("heading", { level: 2, name: "People and participation" })).toBeVisible();
    await expect(participation.getByRole("heading", { level: 3, name: "Researcher", exact: true })).toBeVisible();
    await expect(participation.getByRole("heading", { level: 4, name: person.displayName, exact: true })).toBeVisible();

    // Honest reserved / deferred surfaces.
    await expect(page.getByRole("heading", { level: 2, name: "Institutional relationships" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Scientific contributions" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Historical records" })).toBeVisible();

    // Provenance discoverable.
    await expect(page.getByRole("button", { name: /Provenance of this institution record/i })).toBeVisible();
  });
});

test.describe("a historical institution remains readable, not hidden", () => {
  test("a closed institution shows its historical status and lifespan", async ({ page }) => {
    await registerAndConfirm(page);
    const inst = await newInstitution({
      name: "Beta Historical Institute",
      type: "research_institute",
      status: "historical",
      foundingDate: "1960-01-01",
      foundingPrecision: "year",
      closureDate: "1995-01-01",
      closurePrecision: "year",
    });
    await page.goto(inst.url);
    await expect(page.getByRole("heading", { level: 1, name: inst.name })).toBeVisible();
    await expect(page.getByText(/Research institute · Historical/)).toBeVisible();
    await expect(page.getByText(/1960\s*[–-]\s*1995/)).toBeVisible();
  });
});

test.describe("an institution with little recorded history stays dignified", () => {
  test("honest absence, never fabricated founding narratives or statistics", async ({ page }) => {
    await registerAndConfirm(page);
    const inst = await newInstitution({ name: "Gamma Bare Organization", status: "status_unknown" });
    await page.goto(inst.url);

    await expect(page.getByRole("heading", { level: 1, name: inst.name })).toBeVisible();
    await expect(page.getByText("No institutional history yet")).toBeVisible();
    await expect(page.getByText(/The history of this institution has not yet been recorded/)).toBeVisible();
    await expect(page.getByText("No participation recorded yet")).toBeVisible();
    await expect(page.getByText("Legacy has not yet been recorded")).toBeVisible();
  });
});

test.describe("one canonical participation is consistent from both perspectives", () => {
  test("the same participation shows the institution on the person's page and the person on the institution's page; the person name links to their biography and the org name links to the institution", async ({ page }) => {
    await registerAndConfirm(page);
    const inst = await newInstitution({ name: "Delta Institute", type: "research_institute" });
    const person = await newPerson();
    await addParticipation(person.id, inst.id, { capacity: "director", startDate: "1990-01-01", startPrecision: "year" });

    // Institution page: the person appears in its human history. Scoped to the
    // "People and participation" region: the M8.4 continuity section renders the
    // same capacity ("Director") as an h3 and the same participant as a doorway
    // link in a different region, so the capacity heading, the participant
    // heading, and the doorway link are asserted inside their own section.
    await page.goto(inst.url);
    const participation = page.locator('section[aria-labelledby="participation-heading"]');
    await expect(participation.getByRole("heading", { level: 3, name: "Director", exact: true })).toBeVisible();
    await expect(participation.getByRole("heading", { level: 4, name: person.displayName, exact: true })).toBeVisible();

    // Production Experience Phase I: the participant's name is a DOORWAY to
    // their canonical Person page — meaningful link text (the person's name,
    // never "View"), the mirror of the org-name link asserted below. No dead
    // end from an institution's human history.
    await expect(participation.getByRole("link", { name: person.displayName, exact: true })).toHaveAttribute(
      "href",
      `/people/${person.id}`,
    );

    // Person biography: the SAME participation appears as institutional belonging,
    // and the organization name links to the institution page (discovery).
    await page.goto(person.url);
    await expect(page.getByRole("heading", { level: 3, name: inst.name })).toBeVisible();
    const link = page.getByRole("link", { name: inst.name });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/institutions/${inst.id}`));
    await expect(page.getByRole("heading", { level: 1, name: inst.name })).toBeVisible();
  });
});

test.describe("browser quality and accessibility", () => {
  async function richInstitution() {
    const inst = await newInstitution({
      name: "Epsilon Station",
      shortName: "EPS",
      type: "field_station",
      status: "active",
      foundingDate: "1975-01-01",
      foundingPrecision: "year",
      location: "Somewhere",
    });
    await addOrganizationName(inst.id, { name: "Epsilon Camp", nameType: "former", startDate: "1975-01-01", endDate: "1985-01-01" });
    await addNarrativeFacet(inst.id, { kind: "introduction", body: "A field station with a long history." });
    await addNarrativeFacet(inst.id, { kind: "legacy", body: "Its methods shaped later monitoring." });
    await projectEvent(inst.id, { kind: "site_established", title: "Founded", startDate: "1975-01-01" });
    const person = await newPerson();
    await addParticipation(person.id, inst.id, { capacity: "technician", startDate: "1978-01-01", startPrecision: "year" });
    return inst;
  }

  for (const theme of ["light", "dark"] as const) {
    test(`reads cleanly at 375px with no console errors, duplicate ids, or overflow (${theme})`, async ({ page }) => {
      const issues = attachConsoleWatcher(page);
      await setStoredTheme(page, theme);
      await page.setViewportSize({ width: 375, height: 812 });

      await registerAndConfirm(page);
      const inst = await richInstitution();
      await page.goto(inst.url);
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
    const inst = await richInstitution();
    await page.goto(inst.url);
    await page.waitForLoadState("networkidle");
    const violations = await runAccessibilityScan(page);
    assertNoSeriousOrCriticalViolations(violations);
  });

  test("institution provenance is reachable by keyboard and exposes provenance in its accessible name", async ({ page }) => {
    await registerAndConfirm(page);
    const inst = await newInstitution({ name: "Zeta Institute", type: "research_institute" });
    await page.goto(inst.url);

    const trigger = page.getByRole("button", { name: /Provenance of this institution record/i });
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAccessibleName(/Imported from historical records/);
  });
});
