import { expect, test } from "@playwright/test";

import { assertNoSeriousOrCriticalViolations, runAccessibilityScan } from "./helpers/accessibility";
import { registerAndConfirm } from "./helpers/auth";
import { createBiographyPerson, deleteBiographyPerson } from "./helpers/biography";
import { createInstitution, deleteInstitution } from "./helpers/institution";
import { addParticipation } from "./helpers/participation";
import { attachConsoleWatcher, getDuplicateIds, hasHorizontalOverflow, setStoredTheme } from "./helpers/page-quality";

// End-to-end coverage for the M8.1 Revelation Engine -- co-presence. The
// documented cohorts a person belonged to read INLINE on the Scientific
// Biography (a vantage that opens within the reading, not a destination). A
// cohort appears only where the record documents another person at the SAME
// institution during an OVERLAPPING period; a person at a different institution
// never appears (co-presence is composed from evidence, never inferred). Each
// member links back to their canonical page, carries a keyboard-operable
// provenance affordance, and the section states its honest limits. Disposable,
// isolated fixtures via the established M6 service-role helpers.

const people: string[] = [];
const orgs: string[] = [];

test.afterEach(async () => {
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

test.describe("Revelation (co-presence) — access control", () => {
  test("an unauthenticated visitor cannot read a biography", async ({ page }) => {
    const focal = await newPerson();
    await page.goto(focal.url);
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Revelation (co-presence) — documented cohorts read inline on the biography", () => {
  test("an overlapping co-participant is revealed as a documented cohort member, with provenance and honest limits", async ({
    page,
  }) => {
    await registerAndConfirm(page);
    const focal = await newPerson();
    const member = await newPerson();
    const org = await newOrg("Institute of Forest History", "IFH");
    await addParticipation(focal.id, org.id, { capacity: "researcher", startDate: "1990-01-01" });
    await addParticipation(member.id, org.id, { capacity: "field_assistant", startDate: "1992-01-01" });

    await page.goto(focal.url);

    // Assertions about the revealed member are scoped to the cohorts section: on a
    // person page the same name and the same "Limits of this view" heading can also
    // appear in the mentorship / recurrence / pathway sections, so section-scoping
    // (as every other revelation spec does) asserts the fact where it belongs
    // rather than relying on there being exactly one match on the whole page.
    const section = page.locator('section[aria-labelledby="cohorts-heading"]');

    // The revelation section reads inline, stating what it shows.
    await expect(page.getByRole("heading", { level: 2, name: "Documented cohorts" })).toBeVisible();
    // The institution is the cohort group heading and a doorway back into the record.
    await expect(section.getByRole("heading", { level: 3, name: org.name, exact: true })).toBeVisible();
    // The member reads as documented at the same institution, linking to their page.
    await expect(section.getByRole("link", { name: member.displayName })).toHaveAttribute(
      "href",
      `/people/${member.id}`,
    );
    await expect(section.getByText(`${member.displayName} participated here as a field assistant.`)).toBeVisible();
    // Provenance is one keyboard-operable gesture away.
    await expect(
      section.getByRole("button", { name: new RegExp(`Provenance of ${member.displayName}'s participation`, "i") }),
    ).toBeVisible();
    // The honest limits-of-this-view note is present when a cohort is revealed.
    await expect(section.getByRole("heading", { level: 3, name: "Limits of this view" })).toBeVisible();
    await expect(section.getByText(/documented cohort, not the true one/i)).toBeVisible();
  });

  test("a person at a DIFFERENT institution is never revealed as a cohort member (no inference)", async ({ page }) => {
    await registerAndConfirm(page);
    const focal = await newPerson();
    const stranger = await newPerson();
    const orgA = await newOrg("Alpha Institute");
    const orgB = await newOrg("Beta Archive");
    await addParticipation(focal.id, orgA.id, { capacity: "researcher", startDate: "1990-01-01" });
    await addParticipation(stranger.id, orgB.id, { capacity: "researcher", startDate: "1990-01-01" });

    await page.goto(focal.url);
    await expect(page.getByRole("heading", { level: 2, name: "Documented cohorts" })).toBeVisible();
    // Honest absence: no cohort, and the stranger never appears.
    await expect(page.getByText("No documented cohorts yet")).toBeVisible();
    await expect(page.getByRole("link", { name: stranger.displayName })).toHaveCount(0);
  });

  test("a person with no co-participants shows a dignified honest absence", async ({ page }) => {
    await registerAndConfirm(page);
    const focal = await newPerson();
    const org = await newOrg("Solitary Station");
    await addParticipation(focal.id, org.id, { capacity: "researcher", startDate: "1990-01-01" });

    await page.goto(focal.url);
    await expect(page.getByRole("heading", { level: 2, name: "Documented cohorts" })).toBeVisible();
    await expect(page.getByText("No documented cohorts yet")).toBeVisible();
  });
});

test.describe("Revelation (co-presence) — accessibility and responsive quality", () => {
  test("the biography with a revealed cohort is accessible, dark/light stable, 375px-clean, no console errors", async ({
    page,
  }) => {
    const errors = attachConsoleWatcher(page);
    await registerAndConfirm(page);
    const focal = await newPerson();
    const member = await newPerson();
    const org = await newOrg("Quality Institute");
    await addParticipation(focal.id, org.id, { capacity: "researcher", startDate: "1990-01-01" });
    await addParticipation(member.id, org.id, { capacity: "researcher", startDate: "1991-01-01" });

    await page.goto(focal.url);
    await expect(page.getByRole("heading", { level: 2, name: "Documented cohorts" })).toBeVisible();

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    expect(await getDuplicateIds(page)).toEqual([]);
    assertNoSeriousOrCriticalViolations(await runAccessibilityScan(page));

    await page.setViewportSize({ width: 375, height: 800 });
    expect(await hasHorizontalOverflow(page)).toBe(false);

    await setStoredTheme(page, "dark");
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: "Documented cohorts" })).toBeVisible();
    assertNoSeriousOrCriticalViolations(await runAccessibilityScan(page));

    expect(errors).toEqual([]);

    // The member link and its provenance affordance are keyboard operable.
    const cohorts = page.locator('section[aria-labelledby="cohorts-heading"]');
    const link = cohorts.getByRole("link", { name: member.displayName });
    await link.focus();
    await expect(link).toBeFocused();
  });
});
