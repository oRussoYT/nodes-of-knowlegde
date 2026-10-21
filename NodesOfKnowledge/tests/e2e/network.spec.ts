import { expect, test } from "@playwright/test";

import { assertNoSeriousOrCriticalViolations, runAccessibilityScan } from "./helpers/accessibility";
import { registerAndConfirm } from "./helpers/auth";
import { createBiographyPerson, deleteBiographyPerson } from "./helpers/biography";
import { createContribution, deleteContribution } from "./helpers/contribution";
import { createInstitution, deleteInstitution } from "./helpers/institution";
import { addOrganizationRelationship } from "./helpers/network";
import { addParticipation } from "./helpers/participation";
import { attachConsoleWatcher, getDuplicateIds, hasHorizontalOverflow, setStoredTheme } from "./helpers/page-quality";
import { deleteEvent } from "./helpers/timeline";

// End-to-end coverage for the M7 Knowledge Network Engine AFTER the ADR-0017
// refinement: the Network is invisible historical INFRASTRUCTURE, not a
// destination. Production reads documented connections inline on the canonical
// pages (institutional lineage now reads on the Institution page); there is no
// "Network" navigation entry, and the former /network landing / person /
// contribution routes redirect into the canonical reading experience. One
// dedicated surface -- the institution neighbourhood at
// /network/institutions/[id] -- is retained as the network INSPECTION view.
// Disposable, isolated fixtures via the service-role client.

const people: string[] = [];
const orgs: string[] = [];
const contributions: string[] = [];
const events: string[] = [];

test.afterEach(async () => {
  for (const id of events.splice(0)) await deleteEvent(id).catch(() => {});
  for (const id of contributions.splice(0)) await deleteContribution(id).catch(() => {});
  for (const id of orgs.splice(0)) await deleteInstitution(id).catch(() => {});
  for (const id of people.splice(0)) await deleteBiographyPerson(id).catch(() => {});
});

async function newPerson() {
  const person = await createBiographyPerson({});
  people.push(person.id);
  return person;
}
async function newOrg(name: string, shortName?: string) {
  const org = await createInstitution({ name, shortName });
  orgs.push(org.id);
  return org;
}

test.describe("Knowledge Network — access control", () => {
  test("an unauthenticated visitor is redirected to login", async ({ page }) => {
    await page.goto("/network");
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/network/institutions/00000000-0000-0000-0000-000000000000");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Knowledge Network — invisible infrastructure (no parallel destination)", () => {
  test("there is no Network entry in the primary navigation", async ({ page }) => {
    await registerAndConfirm(page);
    await page.goto("/explore");
    await expect(page.getByRole("navigation").getByRole("link", { name: "Network" })).toHaveCount(0);
  });

  test("the former network routes redirect into the canonical reading experience", async ({ page }) => {
    await registerAndConfirm(page);
    const alice = await newPerson();
    const contribution = await createContribution({ title: "A contribution", kind: "long_term_monitoring", startDate: "1990-01-01" });
    contributions.push(contribution.id);

    await page.goto("/network");
    await expect(page).toHaveURL(/\/explore$/);

    await page.goto(`/network/people/${alice.id}`);
    await expect(page).toHaveURL(new RegExp(`/people/${alice.id}$`));

    await page.goto(`/network/contributions/${contribution.id}`);
    await expect(page).toHaveURL(new RegExp(`/contributions/${contribution.id}$`));
  });

  test("canonical pages carry no 'enter the network' step", async ({ page }) => {
    await registerAndConfirm(page);
    const alice = await newPerson();
    await page.goto(alice.url);
    await expect(page.getByRole("link", { name: /Open the network/i })).toHaveCount(0);
  });
});

test.describe("Knowledge Network — institutional lineage reads inline on the Institution page", () => {
  test("a directional succession reads with inverse roles on both institutions", async ({ page }) => {
    await registerAndConfirm(page);
    const predecessor = await newOrg("Tropical Ecology Archive");
    const successor = await newOrg("Institute of Forest History");
    // source = predecessor, target = successor
    await addOrganizationRelationship(predecessor.id, successor.id, {
      kind: "succession",
      isDirectional: true,
      startDate: "1984-01-01",
    });

    // From the successor's page: the predecessor reads as the Predecessor.
    await page.goto(successor.url);
    await expect(page.getByRole("heading", { level: 2, name: "Institutional relationships" })).toBeVisible();
    await expect(page.getByText(`${predecessor.name} was ${successor.name}'s predecessor.`)).toBeVisible();
    const institutionalRelationships = page.locator('section[aria-labelledby="institutional-relationships-heading"]');
    await expect(institutionalRelationships.getByRole("link", { name: predecessor.name })).toHaveAttribute(
      "href",
      `/institutions/${predecessor.id}`,
    );

    // From the predecessor's page: the SAME record, inverse role.
    await page.goto(predecessor.url);
    await expect(page.getByRole("heading", { level: 2, name: "Institutional relationships" })).toBeVisible();
    await expect(page.getByText(`${successor.name} was ${predecessor.name}'s successor.`)).toBeVisible();
  });

  test("an institution with no institutional relationships shows a dignified honest absence", async ({ page }) => {
    await registerAndConfirm(page);
    const org = await newOrg("Unconnected Institute");
    await page.goto(org.url);
    await expect(page.getByRole("heading", { level: 2, name: "Institutional relationships" })).toBeVisible();
    await expect(page.getByText("No institutional relationships recorded yet")).toBeVisible();
  });
});

test.describe("Knowledge Network — institution neighbourhood (inspection surface)", () => {
  test("the consolidated one-hop neighbourhood shows lineage, members, provenance, and the honest limits", async ({ page }) => {
    await registerAndConfirm(page);
    const alice = await newPerson();
    const org = await newOrg("Museum of Natural History", "MNH");
    const other = await newOrg("Partner Archive");
    await addParticipation(alice.id, org.id, { capacity: "director", startDate: "1980-01-01" });
    await addOrganizationRelationship(org.id, other.id, {
      kind: "affiliation",
      isDirectional: false,
      startDate: "1985-01-01",
      verificationStatus: "disputed",
    });

    await page.goto(`/network/institutions/${org.id}`);
    await expect(page.getByRole("heading", { level: 1, name: org.name })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Documented connections" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Institutional lineage" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "People" })).toBeVisible();
    await expect(page.getByRole("link", { name: alice.displayName })).toHaveAttribute("href", `/people/${alice.id}`);
    // A disputed connection reads calmly with a visible verification label.
    await expect(page.getByText("Disputed").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Provenance of the connection to/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Limits of this view" })).toBeVisible();
    await expect(page.getByText(/not a complete picture of scientific history/i)).toBeVisible();
  });
});

test.describe("Knowledge Network — accessibility and responsive quality", () => {
  test("the Institution page with inline lineage is accessible, dark/light stable, 375px-clean, no console errors", async ({ page }) => {
    const errors = attachConsoleWatcher(page);
    await registerAndConfirm(page);
    const org = await newOrg("Quality Institute");
    const other = await newOrg("Affiliated Institute");
    await addOrganizationRelationship(org.id, other.id, { kind: "affiliation", isDirectional: false, startDate: "1990-01-01" });

    await page.goto(org.url);
    await expect(page.getByRole("heading", { level: 2, name: "Institutional relationships" })).toBeVisible();

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    expect(await getDuplicateIds(page)).toEqual([]);
    assertNoSeriousOrCriticalViolations(await runAccessibilityScan(page));

    await page.setViewportSize({ width: 375, height: 800 });
    expect(await hasHorizontalOverflow(page)).toBe(false);

    await setStoredTheme(page, "dark");
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: "Institutional relationships" })).toBeVisible();
    assertNoSeriousOrCriticalViolations(await runAccessibilityScan(page));

    expect(errors).toEqual([]);
  });

  test("the institution neighbourhood inspection surface is keyboard operable", async ({ page }) => {
    await registerAndConfirm(page);
    const alice = await newPerson();
    const org = await newOrg("Keyboard Institute");
    await addParticipation(alice.id, org.id, { capacity: "researcher", startDate: "1990-01-01" });

    await page.goto(`/network/institutions/${org.id}`);
    const link = page.getByRole("link", { name: alice.displayName });
    await link.focus();
    await expect(link).toBeFocused();
  });
});
