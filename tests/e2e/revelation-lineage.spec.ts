import { expect, test } from "@playwright/test";

import { assertNoSeriousOrCriticalViolations, runAccessibilityScan } from "./helpers/accessibility";
import { registerAndConfirm } from "./helpers/auth";
import { createBiographyPerson, deleteBiographyPerson } from "./helpers/biography";
import { createInstitution, deleteInstitution } from "./helpers/institution";
import { addOrganizationRelationship, deleteOrganizationRelationship } from "./helpers/network";
import { attachConsoleWatcher, getDuplicateIds, hasHorizontalOverflow, setStoredTheme } from "./helpers/page-quality";
import { addRelationship, deleteRelationship } from "./helpers/relationships";

// End-to-end coverage for the M8.3 Revelation Engine -- lineage & institutional
// evolution. Two lenses read INLINE on their canonical pages: the documented
// mentorship descent on the person page, and the documented succession/formation
// descent on the institution page. Each is a bounded, cycle-safe chain of
// same-kind directional records; each step reads directionally ("X is a
// documented predecessor/mentor of Y"), links BOTH endpoints back to their pages,
// carries provenance, and the section marks its limits. Selectors are scoped to
// the lineage section (the person page also has a Relationships section, the
// institution page an M7 lineage section). Disposable, isolated fixtures.

const people: string[] = [];
const orgs: string[] = [];
const rels: string[] = [];
const orgRels: string[] = [];

test.afterEach(async () => {
  for (const id of rels.splice(0)) await deleteRelationship(id).catch(() => {});
  for (const id of orgRels.splice(0)) await deleteOrganizationRelationship(id).catch(() => {});
  for (const id of orgs.splice(0)) await deleteInstitution(id).catch(() => {});
  for (const id of people.splice(0)) await deleteBiographyPerson(id).catch(() => {});
});

async function newPerson() {
  const p = await createBiographyPerson({});
  people.push(p.id);
  return p;
}
async function newOrg(name: string) {
  const o = await createInstitution({ name });
  orgs.push(o.id);
  return o;
}
async function mentors(mentorId: string, studentId: string) {
  rels.push(await addRelationship(mentorId, studentId, { kind: "mentorship", isDirectional: true, startDate: "1980-01-01" }));
}
async function succeeds(predecessorId: string, successorId: string) {
  orgRels.push(
    await addOrganizationRelationship(predecessorId, successorId, { kind: "succession", isDirectional: true, startDate: "1970-01-01" }),
  );
}

test.describe("Revelation (lineage) — mentorship descent on the person page", () => {
  test("a documented mentorship chain reads inline, directionally, with doorways, provenance, and limits", async ({ page }) => {
    await registerAndConfirm(page);
    const mentor = await newPerson();
    const focal = await newPerson();
    const student = await newPerson();
    await mentors(mentor.id, focal.id);
    await mentors(focal.id, student.id);

    await page.goto(focal.url);
    const section = page.locator('section[aria-labelledby="mentorship-lineage-heading"]');

    await expect(page.getByRole("heading", { level: 2, name: "Documented mentorship lineage", exact: true })).toBeVisible();
    await expect(section.getByRole("heading", { level: 3, name: "Documented mentors", exact: true })).toBeVisible();
    await expect(section.getByRole("heading", { level: 3, name: "Documented students", exact: true })).toBeVisible();
    // The focal subject is anchored between mentors and students so the reader
    // sees at a glance where this person sits in the descent.
    await expect(section.getByText("The person you are reading")).toBeVisible();
    // Directional reading of the upstream step, with the mentor a doorway.
    await expect(section.getByText(`${mentor.displayName} is a documented mentor of ${focal.displayName}.`)).toBeVisible();
    await expect(section.getByRole("link", { name: mentor.displayName }).first()).toHaveAttribute("href", `/people/${mentor.id}`);
    // Downstream step: the student is a doorway too.
    await expect(section.getByText(`${focal.displayName} is a documented mentor of ${student.displayName}.`)).toBeVisible();
    await expect(section.getByRole("link", { name: student.displayName }).first()).toHaveAttribute("href", `/people/${student.id}`);
    // Provenance is one keyboard-operable gesture away; limits are stated.
    await expect(section.getByRole("button", { name: /Provenance of the record from/i }).first()).toBeVisible();
    await expect(section.getByText(/documented mentorship lineage, not the true one/i)).toBeVisible();
  });

  test("a person with no mentorship records shows a dignified honest absence", async ({ page }) => {
    await registerAndConfirm(page);
    const focal = await newPerson();
    await page.goto(focal.url);
    const section = page.locator('section[aria-labelledby="mentorship-lineage-heading"]');
    await expect(page.getByRole("heading", { level: 2, name: "Documented mentorship lineage", exact: true })).toBeVisible();
    await expect(section.getByText("No documented mentorship lineage yet")).toBeVisible();
  });
});

test.describe("Revelation (lineage) — succession descent on the institution page", () => {
  test("a documented succession chain reads inline, directionally, with doorways and limits", async ({ page }) => {
    await registerAndConfirm(page);
    const predecessor = await newOrg("Old Field Station");
    const focal = await newOrg("Central Institute");
    const successor = await newOrg("New Research Centre");
    await succeeds(predecessor.id, focal.id);
    await succeeds(focal.id, successor.id);

    await page.goto(`/institutions/${focal.id}`);
    const section = page.locator('section[aria-labelledby="org-lineage-heading"]');

    await expect(page.getByRole("heading", { level: 2, name: "Documented institutional descent", exact: true })).toBeVisible();
    await expect(section.getByRole("heading", { level: 3, name: "Documented antecedents", exact: true })).toBeVisible();
    await expect(section.getByText("The institution you are reading")).toBeVisible();
    await expect(section.getByText(`${predecessor.name} is a documented predecessor of ${focal.name}.`)).toBeVisible();
    await expect(section.getByRole("link", { name: predecessor.name }).first()).toHaveAttribute("href", `/institutions/${predecessor.id}`);
    await expect(section.getByText(`${focal.name} is a documented predecessor of ${successor.name}.`)).toBeVisible();
    await expect(section.getByText(/documented descent, not the true one/i)).toBeVisible();
  });
});

test.describe("Revelation (lineage) — accessibility and responsive quality", () => {
  test("the person page with a revealed mentorship lineage is accessible, dark/light stable, 375px-clean, no console errors", async ({ page }) => {
    const errors = attachConsoleWatcher(page);
    await registerAndConfirm(page);
    const mentor = await newPerson();
    const focal = await newPerson();
    await mentors(mentor.id, focal.id);

    await page.goto(focal.url);
    await expect(page.getByRole("heading", { level: 2, name: "Documented mentorship lineage", exact: true })).toBeVisible();

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    expect(await getDuplicateIds(page)).toEqual([]);
    assertNoSeriousOrCriticalViolations(await runAccessibilityScan(page));

    await page.setViewportSize({ width: 375, height: 800 });
    expect(await hasHorizontalOverflow(page)).toBe(false);

    await setStoredTheme(page, "dark");
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: "Documented mentorship lineage", exact: true })).toBeVisible();
    assertNoSeriousOrCriticalViolations(await runAccessibilityScan(page));

    expect(errors).toEqual([]);
  });
});
