import { expect, test } from "@playwright/test";

import { assertNoSeriousOrCriticalViolations, runAccessibilityScan } from "./helpers/accessibility";
import { registerAndConfirm } from "./helpers/auth";
import { createBiographyPerson, deleteBiographyPerson } from "./helpers/biography";
import { createInstitution, deleteInstitution } from "./helpers/institution";
import { attachConsoleWatcher, getDuplicateIds, hasHorizontalOverflow, setStoredTheme } from "./helpers/page-quality";
import { addParticipation } from "./helpers/participation";
import { addRelationship, deleteRelationship } from "./helpers/relationships";

// End-to-end coverage for the M8.6 Revelation Engine -- the bounded pathway (C6),
// read INLINE on the person page and driven by a selected target (?pathwayTo).
// It reveals the shortest documented chain of >= 2 explicit-assertion steps
// connecting the focal person to the target through intermediaries, over the
// heterogeneous canonical graph, bounded to four steps. It is governed by the
// ENDPOINT RULE: the summary says "a documented chain of N steps connects A and
// B" and never "A is connected to B". Selectors are scoped to the pathway
// section (the chain's entity names also appear in the participation/cohort
// sections). Disposable, isolated fixtures.
//
// Fixture graph: focal A and B both participate at institution X (so A and B are
// also a documented cohort, which supplies the "trace the documented chain to
// this person" doorway); B mentors C (a directional relationship, so no
// symmetric canonical-ordering constraint applies to random fixture ids). Thus
// A -> X -> B -> C is a documented 3-step chain; A -> B is a 2-step chain; a
// fresh unconnected person D yields an honest no-chain state.

const people: string[] = [];
const orgs: string[] = [];
const rels: string[] = [];

test.afterEach(async () => {
  for (const id of rels.splice(0)) await deleteRelationship(id).catch(() => {});
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

async function chainFixture() {
  const a = await newPerson();
  const b = await newPerson();
  const c = await newPerson();
  const x = await newOrg("Shared Institute");
  // Overlapping periods so A and B also form a documented cohort at X (which
  // supplies the pathway doorway), and so both participations are graph edges.
  await addParticipation(a.id, x.id, { capacity: "researcher", startDate: "1980-01-01", endDate: "1990-01-01" });
  await addParticipation(b.id, x.id, { capacity: "researcher", startDate: "1981-01-01", endDate: "1991-01-01" });
  rels.push(await addRelationship(b.id, c.id, { kind: "mentorship", isDirectional: true, startDate: "1990-01-01" }));
  return { a, b, c, x };
}

test.describe("Revelation (pathway) -- a documented chain to a selected target", () => {
  test("a heterogeneous chain reads inline under the endpoint rule, with doorways, provenance, and limits", async ({ page }) => {
    await registerAndConfirm(page);
    const { a, b, c, x } = await chainFixture();

    await page.goto(`/people/${a.id}?pathwayTo=${c.id}`);
    const section = page.locator('section[aria-labelledby="person-pathway-heading"]');

    await expect(page.getByRole("heading", { level: 2, name: "Documented pathway", exact: true })).toBeVisible();
    // Endpoint rule: "a documented chain of N steps connects A and B", never
    // "A is connected to B".
    await expect(section.getByText(`A documented chain of 3 steps connects ${a.displayName} and ${c.displayName}.`)).toBeVisible();
    // Each step reads by its STRUCTURAL CATEGORY (the vocabulary kind is
    // parenthetical, per the structural-naming rule), so the chain is asserted to
    // compose a participation step and a relationship step -- the constitutional
    // invariant -- not one specific intermediate edge kind. Here the relationship
    // step happens to be a mentorship, rendered "documented relationship (mentorship)".
    await expect(section.getByText(/documented participation/i).first()).toBeVisible();
    await expect(section.getByText(/documented relationship/i)).toBeVisible();
    await expect(section.getByRole("link", { name: x.name }).first()).toHaveAttribute("href", `/institutions/${x.id}`);
    await expect(section.getByRole("link", { name: c.displayName }).first()).toHaveAttribute("href", `/people/${c.id}`);
    // Provenance a gesture away; the endpoint-rule limits are stated.
    await expect(section.getByRole("button", { name: /Provenance of the record linking/i }).first()).toBeVisible();
    await expect(section.getByText(/not a connection between its endpoints/i)).toBeVisible();
  });

  test("the 'trace the documented chain' doorway on a revealed person sets the target and reveals the chain", async ({ page }) => {
    await registerAndConfirm(page);
    const { a, b } = await chainFixture();

    // A and B are a documented cohort at the shared institution; B carries the
    // pathway doorway. Following it traces A -> X -> B (a 2-step chain).
    await page.goto(`/people/${a.id}`);
    const cohort = page.locator('section[aria-labelledby="cohorts-heading"]');
    await cohort.getByRole("link", { name: /Trace the documented chain to this person/i }).first().click();

    await expect(page).toHaveURL(new RegExp(`pathwayTo=${b.id}`));
    const section = page.locator('section[aria-labelledby="person-pathway-heading"]');
    await expect(section.getByText(`A documented chain of 2 steps connects ${a.displayName} and ${b.displayName}.`)).toBeVisible();
  });

  test("no target, a disconnected target, and an unknown target each read as their own honest state", async ({ page }) => {
    await registerAndConfirm(page);
    const { a } = await chainFixture();
    const d = await newPerson(); // unconnected to A

    // No target selected.
    await page.goto(`/people/${a.id}`);
    const section = page.locator('section[aria-labelledby="person-pathway-heading"]');
    await expect(section.getByText("Choose an entity to trace a documented chain")).toBeVisible();

    // A resolvable but unconnected target: an honest absence, never "not connected".
    await page.goto(`/people/${a.id}?pathwayTo=${d.id}`);
    await expect(section.getByText("No documented chain within four steps")).toBeVisible();

    // An unresolvable target.
    await page.goto(`/people/${a.id}?pathwayTo=00000000-0000-4000-8000-0000000000ff`);
    await expect(section.getByText("That record could not be found")).toBeVisible();
  });
});

test.describe("Revelation (pathway) -- accessibility and responsive quality", () => {
  test("the person page with a revealed pathway is accessible, dark/light stable, 375px-clean, no console errors", async ({ page }) => {
    const errors = attachConsoleWatcher(page);
    await registerAndConfirm(page);
    const { a, c } = await chainFixture();

    await page.goto(`/people/${a.id}?pathwayTo=${c.id}`);
    await expect(page.getByRole("heading", { level: 2, name: "Documented pathway", exact: true })).toBeVisible();

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    expect(await getDuplicateIds(page)).toEqual([]);
    assertNoSeriousOrCriticalViolations(await runAccessibilityScan(page));

    await page.setViewportSize({ width: 375, height: 800 });
    expect(await hasHorizontalOverflow(page)).toBe(false);

    await setStoredTheme(page, "dark");
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: "Documented pathway", exact: true })).toBeVisible();
    assertNoSeriousOrCriticalViolations(await runAccessibilityScan(page));

    expect(errors).toEqual([]);
  });
});
