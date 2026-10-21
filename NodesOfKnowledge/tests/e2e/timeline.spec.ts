import { expect, test } from "@playwright/test";

import { runAccessibilityScan, assertNoSeriousOrCriticalViolations } from "./helpers/accessibility";
import { registerAndConfirm } from "./helpers/auth";
import { createBiographyPerson, deleteBiographyPerson } from "./helpers/biography";
import { attachConsoleWatcher, getDuplicateIds, hasHorizontalOverflow, setStoredTheme } from "./helpers/page-quality";
import { addEvent, deleteEvent } from "./helpers/timeline";

// End-to-end coverage for the M6.2 Timeline Engine, rendered inside the
// Scientific Biography (/people/[personId]). Authenticated reading only.
// Disposable, isolated fixtures via the service-role client (events and
// person_events are service_role-granted).

const people: string[] = [];
const events: string[] = [];

test.afterEach(async () => {
  for (const id of events.splice(0)) {
    await deleteEvent(id).catch(() => {});
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

async function event(personId: string, input: Parameters<typeof addEvent>[1]) {
  events.push(await addEvent(personId, input));
}

test.describe("access control", () => {
  test("an unauthenticated visitor is redirected to login", async ({ page }) => {
    await page.goto("/people/00000000-0000-0000-0000-000000000000");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("empty timeline", () => {
  test("a biography with no events shows a dignified honest state, never fabricated milestones", async ({ page }) => {
    await registerAndConfirm(page);
    const person = await newPerson();
    await page.goto(person.url);

    await expect(page.getByRole("heading", { level: 2, name: "Timeline" })).toBeVisible();
    await expect(page.getByText("No timeline yet")).toBeVisible();
    await expect(page.getByText(/No timeline events have been recorded/)).toBeVisible();
  });
});

test.describe("year precision does not invent finer precision", () => {
  test("a year-only event reads as the year, never a fabricated month or day", async ({ page }) => {
    await registerAndConfirm(page);
    const person = await newPerson();
    await event(person.id, { kind: "publication", title: "A year-only publication", startDate: "1987-01-01", startPrecision: "year" });
    await page.goto(person.url);

    await expect(page.getByText("A year-only publication")).toBeVisible();
    await expect(page.getByText("1987", { exact: true })).toBeVisible();
    await expect(page.getByText(/January/)).toHaveCount(0);
  });
});

test.describe("the temporal model renders honestly", () => {
  test("exact, approximate, interval, open-ended, uncertain, undated, overlapping, and decade navigation", async ({ page }) => {
    await registerAndConfirm(page);
    const person = await newPerson();

    // Events spanning 1985–1995 (two decades -> decade grouping), including
    // three that overlap in 1987, plus an undated one.
    await event(person.id, { kind: "fieldwork", title: "Approximate fieldwork", startDate: "1985-01-01", startPrecision: "year", isApproximate: true });
    await event(person.id, { kind: "publication", title: "Year publication", startDate: "1987-01-01", startPrecision: "year" });
    await event(person.id, { kind: "appointment", title: "Exact appointment", startDate: "1987-06-15", startPrecision: "day" });
    await event(person.id, { kind: "fieldwork", title: "Interval fieldwork", startDate: "1987-01-01", startPrecision: "year", endDate: "1991-01-01", endPrecision: "year" });
    await event(person.id, { kind: "observation", title: "Uncertain observation", startDate: "1993-01-01", startPrecision: "year", dateIsUncertain: true });
    await event(person.id, { kind: "appointment", title: "Ongoing appointment", startDate: "1995-01-01", startPrecision: "year", isOngoing: true });
    await event(person.id, { kind: "interview", title: "Undated interview", dateIsUnknown: true });

    await page.goto(person.url);

    // Scope to the Timeline region. This person has two fieldwork events and two
    // appointment events, so the M8.5 Documented Recurrence section legitimately
    // re-renders those events' periods (15 June 1987, c. 1985, 1987-1991,
    // 1995-present) and titles in a different region. The period/title
    // assertions below are the Timeline's own, so they read inside the Timeline
    // section. (The uncertain and undated events are single occurrences, form no
    // recurrence group, and so are asserted page-level unchanged.)
    const timeline = page.locator('section[aria-labelledby="timeline-heading"]');

    // Decade navigation (long timeline -> decade anchors as headings).
    await expect(page.getByRole("heading", { level: 3, name: "1980s" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "1990s" })).toBeVisible();

    // Every temporal state, kept distinct in presentation.
    await expect(timeline.getByText("15 June 1987")).toBeVisible();                 // exact
    await expect(timeline.getByText(/c\. 1985/)).toBeVisible();                     // approximate
    await expect(timeline.getByText(/Approximate date/)).toBeVisible();             // approximation note
    await expect(timeline.getByText(/1987\s*[–-]\s*1991/)).toBeVisible();           // interval
    await expect(timeline.getByText(/1995\s*[–-]\s*present/)).toBeVisible();        // open-ended
    await expect(page.getByText(/Proposed date, not yet confirmed/)).toBeVisible(); // uncertain
    await expect(page.getByText("Date unknown").first()).toBeVisible();             // undated (kept, not dropped)

    // Overlapping 1987 events all render; nothing is collapsed or lost.
    for (const title of ["Approximate fieldwork", "Year publication", "Exact appointment", "Interval fieldwork", "Uncertain observation", "Ongoing appointment", "Undated interview"]) {
      await expect(timeline.getByText(title)).toBeVisible();
    }

    // Provenance discoverable per event.
    await expect(page.getByRole("button", { name: /Provenance of this event/i }).first()).toBeVisible();
  });
});

test.describe("browser quality and accessibility", () => {
  async function richPerson() {
    const person = await newPerson();
    await event(person.id, { kind: "fieldwork", title: "Fieldwork", startDate: "1985-01-01", startPrecision: "year" });
    await event(person.id, { kind: "appointment", title: "Appointment", startDate: "1992-01-01", startPrecision: "year", isOngoing: true });
    await event(person.id, { kind: "interview", title: "Interview", dateIsUnknown: true });
    return person;
  }

  for (const theme of ["light", "dark"] as const) {
    test(`reads cleanly at 375px with no console errors, duplicate ids, or overflow (${theme})`, async ({ page }) => {
      const issues = attachConsoleWatcher(page);
      await setStoredTheme(page, theme);
      await page.setViewportSize({ width: 375, height: 812 });

      await registerAndConfirm(page);
      const person = await richPerson();
      await page.goto(person.url);
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
    const person = await richPerson();
    await page.goto(person.url);
    await page.waitForLoadState("networkidle");
    const violations = await runAccessibilityScan(page);
    assertNoSeriousOrCriticalViolations(violations);
  });

  test("event provenance is reachable and operable by keyboard", async ({ page }) => {
    await registerAndConfirm(page);
    const person = await newPerson();
    await event(person.id, { kind: "publication", title: "A publication", startDate: "1987-01-01", startPrecision: "year" });
    await page.goto(person.url);

    const trigger = page.getByRole("button", { name: /Provenance of this event/i }).first();
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await expect(page.getByText("Imported from historical records").first()).toBeVisible();
  });
});
