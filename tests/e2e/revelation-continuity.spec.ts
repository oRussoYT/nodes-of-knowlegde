import { expect, test } from "@playwright/test";

import { assertNoSeriousOrCriticalViolations, runAccessibilityScan } from "./helpers/accessibility";
import { registerAndConfirm } from "./helpers/auth";
import { createBiographyPerson, deleteBiographyPerson } from "./helpers/biography";
import { createInstitution, deleteInstitution } from "./helpers/institution";
import { attachConsoleWatcher, getDuplicateIds, hasHorizontalOverflow, setStoredTheme } from "./helpers/page-quality";
import { addParticipation } from "./helpers/participation";

// End-to-end coverage for the M8.4 Revelation Engine -- continuity & rupture. One
// lens read INLINE on the institution page: the documented COVERAGE of each
// participation capacity over time (year-summarised spans + the silences between
// them) plus the institution's own recorded status. It holds four honest states
// apart and never collapses them: an open-ended record is documented
// CONTINUATION; a terminal recorded status is a documented RUPTURE (with its
// closure date); a silence between spans is an EVIDENTIARY GAP, never an end; a
// record that simply stops is an UNKNOWN OUTCOME. Selectors are scoped to the
// continuity section (the institution page also carries a Participation section
// with the same people, capacities, and periods). Disposable, isolated fixtures;
// deleting the institution cascades its participations.

const insts: string[] = [];
const people: string[] = [];

test.afterEach(async () => {
  for (const id of insts.splice(0)) await deleteInstitution(id).catch(() => {});
  for (const id of people.splice(0)) await deleteBiographyPerson(id).catch(() => {});
});

async function newPerson() {
  const p = await createBiographyPerson({});
  people.push(p.id);
  return p;
}

test.describe("Revelation (continuity) -- documented coverage on the institution page", () => {
  test("coverage reads inline: a continuous span, an evidentiary gap, an open-ended continuation, with doorways, provenance, and limits", async ({ page }) => {
    await registerAndConfirm(page);
    const focal = await createInstitution({ name: "Focal Station", status: "active" });
    insts.push(focal.id);
    const a = await newPerson();
    const b = await newPerson();
    const c = await newPerson();
    const d = await newPerson();

    // researcher: two overlapping records -> one continuous span 1970-1980.
    await addParticipation(a.id, focal.id, { capacity: "researcher", startDate: "1970-01-01", endDate: "1975-12-31" });
    await addParticipation(b.id, focal.id, { capacity: "researcher", startDate: "1974-01-01", endDate: "1980-12-31" });
    // director: a multi-year silence -> two spans + one gap (1965 -> 1980).
    await addParticipation(a.id, focal.id, { capacity: "director", startDate: "1960-01-01", endDate: "1965-12-31" });
    await addParticipation(c.id, focal.id, { capacity: "director", startDate: "1980-01-01", endDate: "1985-12-31" });
    // technician: an open-ended record -> a continuation span.
    await addParticipation(d.id, focal.id, { capacity: "technician", startDate: "1990-01-01", isOngoing: true });

    await page.goto(`/institutions/${focal.id}`);
    const section = page.locator('section[aria-labelledby="org-continuity-heading"]');

    await expect(page.getByRole("heading", { level: 2, name: "Documented continuity and rupture", exact: true })).toBeVisible();
    await expect(section.getByText("The record documents this institution as active.")).toBeVisible();

    // Continuous researcher span (the two overlapping records merged).
    await expect(section.getByRole("heading", { level: 3, name: "Researcher", exact: true })).toBeVisible();
    await expect(section.getByText("Documented from 1970 to 1980.")).toBeVisible();

    // A gap is stated as a silence in the record -- explicitly not an ending.
    await expect(section.getByText(/between 1965 and 1980 — a gap in the record, not a documented ending/i)).toBeVisible();

    // An open-ended record reads as continuation.
    await expect(section.getByText("Documented from 1990, open-ended in the latest record.")).toBeVisible();
    await expect(section.getByText(/documents this capacity as still current/i)).toBeVisible();

    // A revealed person is a doorway back into the record.
    await expect(section.getByRole("link", { name: d.displayName }).first()).toHaveAttribute("href", `/people/${d.id}`);
    // Provenance is one keyboard-operable gesture away; limits are stated.
    await expect(section.getByRole("button", { name: /Provenance of the participation record/i }).first()).toBeVisible();
    await expect(section.getByText(/documented coverage, not the true one/i)).toBeVisible();
  });

  test("a documented closure is shown apart from coverage, and never dates a practice's end", async ({ page }) => {
    await registerAndConfirm(page);
    const closed = await createInstitution({ name: "Closed Institute", status: "closed", closureDate: "1998-06-01", closurePrecision: "month" });
    insts.push(closed.id);
    const a = await newPerson();
    // researcher coverage ends 1990, while the institution's closure is 1998.
    await addParticipation(a.id, closed.id, { capacity: "researcher", startDate: "1980-01-01", endDate: "1990-12-31" });

    await page.goto(`/institutions/${closed.id}`);
    const section = page.locator('section[aria-labelledby="org-continuity-heading"]');

    // The rupture is the institution's own explicit status, with its closure year.
    await expect(section.getByText("The record documents this institution as closed in 1998.")).toBeVisible();
    // The practice's own end (1990) is never back-filled to the 1998 closure...
    await expect(section.getByText("Documented from 1980 to 1990.")).toBeVisible();
    // ...and a closed final span reads as an undocumented outcome, never an ending.
    await expect(section.getByText(/does not document what followed/i)).toBeVisible();
  });

  test("an institution with no dated participations and no terminal status shows a dignified honest absence", async ({ page }) => {
    await registerAndConfirm(page);
    const empty = await createInstitution({ name: "Quiet House", status: "active" });
    insts.push(empty.id);

    await page.goto(`/institutions/${empty.id}`);
    const section = page.locator('section[aria-labelledby="org-continuity-heading"]');
    await expect(page.getByRole("heading", { level: 2, name: "Documented continuity and rupture", exact: true })).toBeVisible();
    await expect(section.getByText("No documented continuity yet")).toBeVisible();
  });
});

test.describe("Revelation (continuity) -- accessibility and responsive quality", () => {
  test("the institution page with revealed coverage is accessible, dark/light stable, 375px-clean, no console errors", async ({ page }) => {
    const errors = attachConsoleWatcher(page);
    await registerAndConfirm(page);
    const focal = await createInstitution({ name: "Focal Station", status: "active" });
    insts.push(focal.id);
    const a = await newPerson();
    await addParticipation(a.id, focal.id, { capacity: "researcher", startDate: "1990-01-01", isOngoing: true });

    await page.goto(`/institutions/${focal.id}`);
    await expect(page.getByRole("heading", { level: 2, name: "Documented continuity and rupture", exact: true })).toBeVisible();

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    expect(await getDuplicateIds(page)).toEqual([]);
    assertNoSeriousOrCriticalViolations(await runAccessibilityScan(page));

    await page.setViewportSize({ width: 375, height: 800 });
    expect(await hasHorizontalOverflow(page)).toBe(false);

    await setStoredTheme(page, "dark");
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: "Documented continuity and rupture", exact: true })).toBeVisible();
    assertNoSeriousOrCriticalViolations(await runAccessibilityScan(page));

    expect(errors).toEqual([]);
  });
});
