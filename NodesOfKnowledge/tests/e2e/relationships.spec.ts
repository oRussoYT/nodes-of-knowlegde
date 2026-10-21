import { expect, test } from "@playwright/test";

import { runAccessibilityScan, assertNoSeriousOrCriticalViolations } from "./helpers/accessibility";
import { registerAndConfirm } from "./helpers/auth";
import { createBiographyPerson, deleteBiographyPerson } from "./helpers/biography";
import { attachConsoleWatcher, getDuplicateIds, hasHorizontalOverflow, setStoredTheme } from "./helpers/page-quality";
import { addRelationship, deleteRelationship } from "./helpers/relationships";

// End-to-end coverage for the M6.4 Relationship Engine, rendered inside the
// Scientific Biography (/people/[personId]). Authenticated reading only.
// Disposable, isolated fixtures via the service-role client (relationships are
// service_role-granted). One registered viewer can read any person's
// biography, so both sides of a bond are checked with a single account.

const people: string[] = [];
const relationships: string[] = [];

test.afterEach(async () => {
  for (const id of relationships.splice(0)) {
    await deleteRelationship(id).catch(() => {});
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

async function relate(aId: string, bId: string, input: Parameters<typeof addRelationship>[2]) {
  relationships.push(await addRelationship(aId, bId, input));
}

test.describe("access control", () => {
  test("an unauthenticated visitor is redirected to login", async ({ page }) => {
    await page.goto("/people/00000000-0000-0000-0000-000000000000");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("empty relationships", () => {
  test("a biography with no relationships shows a dignified honest state, never suggested or inferred connections", async ({ page }) => {
    await registerAndConfirm(page);
    const person = await newPerson();
    await page.goto(person.url);

    await expect(page.getByRole("heading", { level: 2, name: "Relationships" })).toBeVisible();
    await expect(page.getByText("No relationships yet")).toBeVisible();
    await expect(page.getByText(/No relationships have been recorded/)).toBeVisible();
  });
});

test.describe("a directional relationship reads with inverse labels on both biographies", () => {
  test("one canonical mentorship shows Bob as a Student on Alice's page and Alice as a Mentor on Bob's page, with narrative, period, and provenance", async ({ page }) => {
    await registerAndConfirm(page);
    const alice = await newPerson();
    const bob = await newPerson();
    await relate(alice.id, bob.id, {
      kind: "mentorship",
      isDirectional: true,
      narrative: "They met during early fieldwork and worked closely for a decade.",
      startDate: "1987-01-01",
      startPrecision: "year",
      endDate: "1998-01-01",
      endPrecision: "year",
    });

    // Alice is the mentor (source): Bob appears under "Students".
    await page.goto(alice.url);
    const relationships = page.locator('section[aria-labelledby="relationships-heading"]');
    await expect(page.getByRole("heading", { level: 2, name: "Relationships" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Students", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 4, name: bob.displayName, exact: true })).toBeVisible();
    await expect(page.getByText("They met during early fieldwork and worked closely for a decade.")).toBeVisible();
    await expect(relationships.getByText(/1987\s*[–-]\s*1998/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Provenance of the relationship with/i }).first()).toBeVisible();

    // Bob is the student (target): the SAME record shows Alice under "Mentors"
    // (the inverse label) -- no duplicate row exists.
    await page.goto(bob.url);
    await expect(page.getByRole("heading", { level: 3, name: "Mentors", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 4, name: alice.displayName, exact: true })).toBeVisible();
    // The "Students" heading never appears on the student's page.
    await expect(page.getByRole("heading", { level: 3, name: "Students", exact: true })).toHaveCount(0);
  });
});

test.describe("a relationship counterpart is a doorway to their canonical Person page", () => {
  test("the counterpart name links to the other person's biography and navigates there — no dead end", async ({ page }) => {
    await registerAndConfirm(page);
    const alice = await newPerson();
    const bob = await newPerson();
    await relate(alice.id, bob.id, {
      kind: "mentorship",
      isDirectional: true,
      startDate: "1987-01-01",
      startPrecision: "year",
    });

    // Production Experience Phase I: a documented bond is a doorway. On Alice's
    // page, Bob's name is a link to his canonical biography (meaningful link
    // text — the person's name, never "View"), justified by the canonical
    // relationship assertion and reasoned by the surrounding role group.
    await page.goto(alice.url);
    const relationships = page.locator('section[aria-labelledby="relationships-heading"]');
    const counterpart = relationships.getByRole("link", { name: bob.displayName, exact: true });
    await expect(counterpart).toHaveAttribute("href", `/people/${bob.id}`);

    // Following it lands on the counterpart's canonical Person page.
    await counterpart.click();
    await expect(page).toHaveURL(new RegExp(`/people/${bob.id}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  });
});

test.describe("a symmetric relationship reads on both biographies under the same role", () => {
  test("one canonical collaboration shows each counterpart under Collaborators on both pages", async ({ page }) => {
    await registerAndConfirm(page);
    const carol = await newPerson();
    const dave = await newPerson();
    // Missing narrative here: the entry must still read honestly (no fabrication).
    await relate(carol.id, dave.id, { kind: "collaboration", isDirectional: false, startDate: "1990-01-01", startPrecision: "year" });

    await page.goto(carol.url);
    await expect(page.getByRole("heading", { level: 3, name: "Collaborators", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 4, name: dave.displayName, exact: true })).toBeVisible();

    await page.goto(dave.url);
    await expect(page.getByRole("heading", { level: 3, name: "Collaborators", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 4, name: carol.displayName, exact: true })).toBeVisible();
  });
});

test.describe("uncertain and disputed states surface honestly", () => {
  test("an approximate, ongoing, disputed relationship shows its temporal state and its disputed provenance", async ({ page }) => {
    await registerAndConfirm(page);
    const a = await newPerson();
    const b = await newPerson();
    await relate(a.id, b.id, {
      kind: "collaboration",
      isDirectional: false,
      startDate: "1995-01-01",
      startPrecision: "year",
      isApproximate: true,
      isOngoing: true,
      sourceType: "nominated_by_other",
      verificationStatus: "disputed",
    });

    await page.goto(a.url);
    await expect(page.getByText(/c\. 1995\s*[–-]\s*present/)).toBeVisible();       // approximate + ongoing
    await expect(page.getByText(/Approximate date/)).toBeVisible();
    // Disputed status is carried deterministically in the provenance accessible name.
    await expect(page.getByRole("button", { name: /Provenance of the relationship with .*Disputed/i })).toBeVisible();
  });
});

test.describe("browser quality and accessibility", () => {
  async function richPerson() {
    const subject = await newPerson();
    const mentor = await newPerson();
    const student = await newPerson();
    const peer = await newPerson();
    await relate(mentor.id, subject.id, { kind: "mentorship", isDirectional: true, startDate: "1985-01-01", startPrecision: "year" });
    await relate(subject.id, student.id, { kind: "mentorship", isDirectional: true, startDate: "1996-01-01", startPrecision: "year", isOngoing: true });
    await relate(subject.id, peer.id, { kind: "collaboration", isDirectional: false, dateIsUnknown: true });
    return subject;
  }

  for (const theme of ["light", "dark"] as const) {
    test(`reads cleanly at 375px with no console errors, duplicate ids, or overflow (${theme})`, async ({ page }) => {
      const issues = attachConsoleWatcher(page);
      await setStoredTheme(page, theme);
      await page.setViewportSize({ width: 375, height: 812 });

      await registerAndConfirm(page);
      const subject = await richPerson();
      await page.goto(subject.url);
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
    const subject = await richPerson();
    await page.goto(subject.url);
    await page.waitForLoadState("networkidle");
    const violations = await runAccessibilityScan(page);
    assertNoSeriousOrCriticalViolations(violations);
  });

  test("relationship provenance is reachable by keyboard and exposes provenance in its accessible name", async ({ page }) => {
    await registerAndConfirm(page);
    const a = await newPerson();
    const b = await newPerson();
    await relate(a.id, b.id, { kind: "collaboration", isDirectional: false, startDate: "1990-01-01", startPrecision: "year" });
    await page.goto(a.url);

    const trigger = page.getByRole("button", { name: /Provenance of the relationship with/i }).first();
    await trigger.focus();
    await expect(trigger).toBeFocused();
    // The full provenance is exposed to assistive technology through the
    // trigger's server-rendered accessible name (deterministic), independent of
    // the visual tooltip portal.
    await expect(trigger).toHaveAccessibleName(/Imported from historical records/);
  });
});
