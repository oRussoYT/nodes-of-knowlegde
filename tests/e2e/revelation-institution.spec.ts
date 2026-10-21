import { expect, test } from "@playwright/test";

import { assertNoSeriousOrCriticalViolations, runAccessibilityScan } from "./helpers/accessibility";
import { registerAndConfirm } from "./helpers/auth";
import { createBiographyPerson, deleteBiographyPerson } from "./helpers/biography";
import { createInstitution, deleteInstitution } from "./helpers/institution";
import { addParticipation } from "./helpers/participation";
import { attachConsoleWatcher, getDuplicateIds, hasHorizontalOverflow, setStoredTheme } from "./helpers/page-quality";

// End-to-end coverage for the M8.2 Revelation Engine -- institution-surface
// co-presence. The DOCUMENTED CO-PRESENCE within an institution reads INLINE on
// the institution page (a vantage that opens within the reading, not a
// destination): which participants the record places there at the same time as
// which others. It is the institution-vantage mirror of M8.1's person cohorts.
// A person appears only where the record documents them at the SAME institution
// during an OVERLAPPING period; a person at a different institution never appears
// (co-presence is composed from evidence, never inferred). Each person links back
// to their canonical page, carries a keyboard-operable provenance affordance, and
// the section states its honest limits. Selectors are scoped to the co-presence
// section and use heading level + exact, since participants also appear in the
// institution's Participation section. Disposable, isolated fixtures.

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

test.describe("Revelation (institution co-presence) — access control", () => {
  test("an unauthenticated visitor cannot read an institution", async ({ page }) => {
    const org = await newOrg("Access Institute");
    await page.goto(`/institutions/${org.id}`);
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Revelation (institution co-presence) — documented co-presence reads inline on the institution", () => {
  test("two overlapping participants are revealed as documented co-presence, with provenance and honest limits", async ({
    page,
  }) => {
    await registerAndConfirm(page);
    const focal = await newPerson();
    const member = await newPerson();
    const org = await newOrg("Institute of Forest History", "IFH");
    await addParticipation(focal.id, org.id, { capacity: "researcher", startDate: "1990-01-01" });
    await addParticipation(member.id, org.id, { capacity: "field_assistant", startDate: "1992-01-01" });

    await page.goto(`/institutions/${org.id}`);

    const section = page.locator('section[aria-labelledby="org-copresence-heading"]');

    // The revelation section reads inline, stating what it shows.
    await expect(page.getByRole("heading", { level: 2, name: "Documented co-presence", exact: true })).toBeVisible();
    // The focal participant is an anchor (an h3 under the section's h2).
    await expect(section.getByRole("heading", { level: 3, name: focal.displayName, exact: true })).toBeVisible();
    // The other participant reads as documented here at the same time, linking to their page.
    await expect(section.getByRole("link", { name: member.displayName }).first()).toHaveAttribute(
      "href",
      `/people/${member.id}`,
    );
    await expect(
      section.getByText(`${member.displayName} participated here as a field assistant.`).first(),
    ).toBeVisible();
    // Provenance is one keyboard-operable gesture away.
    await expect(
      section
        .getByRole("button", { name: new RegExp(`Provenance of ${member.displayName}'s participation`, "i") })
        .first(),
    ).toBeVisible();
    // The honest limits-of-this-view note is present when co-presence is revealed.
    await expect(section.getByText(/documented co-presence, not the true one/i)).toBeVisible();
  });

  test("a person at a DIFFERENT institution is never revealed as co-presence (no inference)", async ({ page }) => {
    await registerAndConfirm(page);
    const focal = await newPerson();
    const stranger = await newPerson();
    const orgA = await newOrg("Alpha Institute");
    const orgB = await newOrg("Beta Archive");
    await addParticipation(focal.id, orgA.id, { capacity: "researcher", startDate: "1990-01-01" });
    await addParticipation(stranger.id, orgB.id, { capacity: "researcher", startDate: "1990-01-01" });

    await page.goto(`/institutions/${orgA.id}`);
    const section = page.locator('section[aria-labelledby="org-copresence-heading"]');
    await expect(page.getByRole("heading", { level: 2, name: "Documented co-presence", exact: true })).toBeVisible();
    // Honest absence: a sole participant, and the stranger never appears.
    await expect(section.getByText("No documented co-presence yet")).toBeVisible();
    await expect(section.getByRole("link", { name: stranger.displayName })).toHaveCount(0);
  });

  test("an institution with a single participant shows a dignified honest absence", async ({ page }) => {
    await registerAndConfirm(page);
    const focal = await newPerson();
    const org = await newOrg("Solitary Station");
    await addParticipation(focal.id, org.id, { capacity: "researcher", startDate: "1990-01-01" });

    await page.goto(`/institutions/${org.id}`);
    const section = page.locator('section[aria-labelledby="org-copresence-heading"]');
    await expect(page.getByRole("heading", { level: 2, name: "Documented co-presence", exact: true })).toBeVisible();
    await expect(section.getByText("No documented co-presence yet")).toBeVisible();
  });
});

test.describe("Revelation (institution co-presence) — accessibility and responsive quality", () => {
  test("the institution with revealed co-presence is accessible, dark/light stable, 375px-clean, no console errors", async ({
    page,
  }) => {
    const errors = attachConsoleWatcher(page);
    await registerAndConfirm(page);
    const focal = await newPerson();
    const member = await newPerson();
    const org = await newOrg("Quality Institute");
    await addParticipation(focal.id, org.id, { capacity: "researcher", startDate: "1990-01-01" });
    await addParticipation(member.id, org.id, { capacity: "researcher", startDate: "1991-01-01" });

    await page.goto(`/institutions/${org.id}`);
    await expect(page.getByRole("heading", { level: 2, name: "Documented co-presence", exact: true })).toBeVisible();

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    expect(await getDuplicateIds(page)).toEqual([]);
    assertNoSeriousOrCriticalViolations(await runAccessibilityScan(page));

    await page.setViewportSize({ width: 375, height: 800 });
    expect(await hasHorizontalOverflow(page)).toBe(false);

    await setStoredTheme(page, "dark");
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: "Documented co-presence", exact: true })).toBeVisible();
    assertNoSeriousOrCriticalViolations(await runAccessibilityScan(page));

    expect(errors).toEqual([]);

    // The co-presence person link is keyboard operable.
    const section = page.locator('section[aria-labelledby="org-copresence-heading"]');
    const link = section.getByRole("link", { name: member.displayName }).first();
    await link.focus();
    await expect(link).toBeFocused();
  });
});
