import { expect, test } from "@playwright/test";

import { assertNoSeriousOrCriticalViolations, runAccessibilityScan } from "./helpers/accessibility";
import { registerAndConfirm } from "./helpers/auth";
import { createBiographyPerson, deleteBiographyPerson } from "./helpers/biography";
import {
  addOrganizationContribution,
  addPersonContribution,
  createContribution,
  deleteContribution,
} from "./helpers/contribution";
import { addOrganizationEvent, createInstitution, deleteInstitution } from "./helpers/institution";
import { attachConsoleWatcher, getDuplicateIds, hasHorizontalOverflow, setStoredTheme } from "./helpers/page-quality";
import { addParticipation } from "./helpers/participation";
import { addEvent, deleteEvent } from "./helpers/timeline";

// End-to-end coverage for the M8.5 Revelation Engine -- documented recurrence.
// Two lenses read INLINE: a person's repeated phenomena on the biography (after
// cohorts and mentorship lineage) and an institution's repeated phenomena on the
// institution page (after continuity). Each is the SAME phenomenon documented
// >= 2 times -- a role held again, same-kind events, same-kind contributions --
// shown with a plain count ("Documented N times as ...") that is a count of
// records, never a rank, and with occurrences in time order, each decomposable
// (a contribution occurrence is a doorway; an event carries its title). Selectors
// are scoped to the recurrence section (the timeline/participation/contribution
// engines render the same records elsewhere). Disposable, isolated fixtures.

const institutions: string[] = [];
const people: string[] = [];
const events: string[] = [];
const contributions: string[] = [];

test.afterEach(async () => {
  for (const id of contributions.splice(0)) await deleteContribution(id).catch(() => {});
  for (const id of events.splice(0)) await deleteEvent(id).catch(() => {});
  for (const id of institutions.splice(0)) await deleteInstitution(id).catch(() => {});
  for (const id of people.splice(0)) await deleteBiographyPerson(id).catch(() => {});
});

async function newInstitution(name: string) {
  const inst = await createInstitution({ name });
  institutions.push(inst.id);
  return inst;
}
async function newPerson() {
  const person = await createBiographyPerson({});
  people.push(person.id);
  return person;
}

test.describe("Revelation (recurrence) -- documented repetition on the person page", () => {
  test("repeated role, repeated events, and repeated contributions read inline, counted, with doorways and limits", async ({ page }) => {
    await registerAndConfirm(page);
    const inst = await newInstitution("Alpha Station");
    const person = await newPerson();

    // A role held twice at the same institution.
    await addParticipation(person.id, inst.id, { capacity: "director", startDate: "1980-01-01" });
    await addParticipation(person.id, inst.id, { capacity: "director", startDate: "1990-01-01" });
    // Two documented events of the same kind.
    events.push(await addEvent(person.id, { kind: "expedition", title: "First Expedition", startDate: "1981-01-01" }));
    events.push(await addEvent(person.id, { kind: "expedition", title: "Second Expedition", startDate: "1986-01-01" }));
    // Two documented contributions of the same kind.
    const cA = await createContribution({ title: "Field Note A", kind: "field_knowledge", startDate: "1982-01-01" });
    const cB = await createContribution({ title: "Field Note B", kind: "field_knowledge", startDate: "1987-01-01" });
    contributions.push(cA.id, cB.id);
    await addPersonContribution(cA.id, person.id, { capacity: "field_observation" });
    await addPersonContribution(cB.id, person.id, { capacity: "field_observation" });

    await page.goto(person.url);
    const section = page.locator('section[aria-labelledby="person-recurrence-heading"]');

    await expect(page.getByRole("heading", { level: 2, name: "Documented recurrence", exact: true })).toBeVisible();

    // Role recurrence: counted, with the institution as a doorway.
    await expect(section.getByText(/Documented 2 times as Director at Alpha Station/)).toBeVisible();
    await expect(section.getByRole("link", { name: inst.name }).first()).toHaveAttribute(
      "href",
      `/institutions/${inst.id}`,
    );
    // Event recurrence: counted, structural, kind-labelled.
    await expect(section.getByText(/Documented 2 times as an event of kind/)).toBeVisible();
    // Contribution recurrence: counted, each occurrence a doorway to its page.
    await expect(section.getByText(/Documented 2 times as a contribution of kind/)).toBeVisible();
    await expect(section.getByRole("link", { name: cA.title }).first()).toHaveAttribute(
      "href",
      `/contributions/${cA.id}`,
    );

    // Provenance one keyboard gesture away; honest limits stated.
    await expect(section.getByRole("button", { name: /Provenance of/i }).first()).toBeVisible();
    await expect(section.getByText(/documented recurrence, not the true one/i)).toBeVisible();
  });

  test("a person with only single occurrences shows a dignified honest absence", async ({ page }) => {
    await registerAndConfirm(page);
    const inst = await newInstitution("Beta Station");
    const person = await newPerson();
    await addParticipation(person.id, inst.id, { capacity: "director", startDate: "1980-01-01" });

    await page.goto(person.url);
    const section = page.locator('section[aria-labelledby="person-recurrence-heading"]');
    await expect(page.getByRole("heading", { level: 2, name: "Documented recurrence", exact: true })).toBeVisible();
    await expect(section.getByText("No documented recurrence yet")).toBeVisible();
  });
});

test.describe("Revelation (recurrence) -- documented repetition on the institution page", () => {
  test("repeated same-kind events and contributions read inline, counted, with doorways and limits", async ({ page }) => {
    await registerAndConfirm(page);
    const inst = await newInstitution("Gamma Institute");

    events.push(await addOrganizationEvent(inst.id, { kind: "expedition", title: "Org Expedition A", startDate: "1961-01-01" }));
    events.push(await addOrganizationEvent(inst.id, { kind: "expedition", title: "Org Expedition B", startDate: "1966-01-01" }));
    const cA = await createContribution({ title: "Org Report A", kind: "publication_or_report", startDate: "1962-01-01" });
    const cB = await createContribution({ title: "Org Report B", kind: "publication_or_report", startDate: "1967-01-01" });
    contributions.push(cA.id, cB.id);
    await addOrganizationContribution(cA.id, inst.id, { capacity: "institutional_support" });
    await addOrganizationContribution(cB.id, inst.id, { capacity: "institutional_support" });

    await page.goto(`/institutions/${inst.id}`);
    const section = page.locator('section[aria-labelledby="org-recurrence-heading"]');

    await expect(page.getByRole("heading", { level: 2, name: "Documented recurrence", exact: true })).toBeVisible();
    await expect(section.getByText(/Documented 2 times as an event of kind/)).toBeVisible();
    await expect(section.getByText(/Documented 2 times as a contribution of kind/)).toBeVisible();
    await expect(section.getByRole("link", { name: cA.title }).first()).toHaveAttribute(
      "href",
      `/contributions/${cA.id}`,
    );
    await expect(section.getByText(/documented recurrence, not the true one/i)).toBeVisible();
  });
});

test.describe("Revelation (recurrence) -- accessibility and responsive quality", () => {
  test("the person page with revealed recurrence is accessible, dark/light stable, 375px-clean, no console errors", async ({ page }) => {
    const errors = attachConsoleWatcher(page);
    await registerAndConfirm(page);
    const inst = await newInstitution("Delta Station");
    const person = await newPerson();
    await addParticipation(person.id, inst.id, { capacity: "director", startDate: "1980-01-01" });
    await addParticipation(person.id, inst.id, { capacity: "director", startDate: "1990-01-01" });

    await page.goto(person.url);
    await expect(page.getByRole("heading", { level: 2, name: "Documented recurrence", exact: true })).toBeVisible();

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    expect(await getDuplicateIds(page)).toEqual([]);
    assertNoSeriousOrCriticalViolations(await runAccessibilityScan(page));

    await page.setViewportSize({ width: 375, height: 800 });
    expect(await hasHorizontalOverflow(page)).toBe(false);

    await setStoredTheme(page, "dark");
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: "Documented recurrence", exact: true })).toBeVisible();
    assertNoSeriousOrCriticalViolations(await runAccessibilityScan(page));

    expect(errors).toEqual([]);
  });
});
