import { describe, expect, it } from "vitest";

import {
  describeRecurrenceGroup,
  revelationCopy,
  revelationSourceRecordLabel,
} from "../../src/features/revelation/copy";
import type { RecurrenceGroup } from "../../src/features/revelation/types";

function group(
  category: RecurrenceGroup["category"],
  label: string,
  count: number,
  anchorLabel: string | null = null,
): RecurrenceGroup {
  return {
    category,
    label,
    anchor:
      anchorLabel === null
        ? null
        : {
            type: "organization",
            id: "o1",
            label: anchorLabel,
            secondaryLabel: null,
            href: "/institutions/o1",
            verificationStatus: "provisional",
          },
    count,
    occurrences: [],
  };
}

describe("describeRecurrenceGroup", () => {
  it("leads with the plain count and reads structurally, never as a rank or importance", () => {
    expect(describeRecurrenceGroup(group("role", "Director", 3, "Alpha Station"))).toBe(
      "Documented 3 times as Director at Alpha Station.",
    );
    expect(describeRecurrenceGroup(group("event", "Expedition", 4))).toBe(
      "Documented 4 times as an event of kind Expedition.",
    );
    expect(describeRecurrenceGroup(group("contribution", "Publication", 2))).toBe(
      "Documented 2 times as a contribution of kind Publication.",
    );
  });
});

describe("revelationSourceRecordLabel (M8.5 sources)", () => {
  it("labels event and contribution records for provenance disclosure", () => {
    expect(revelationSourceRecordLabel("events")).toBe("event record");
    expect(revelationSourceRecordLabel("contributions")).toBe("contribution record");
    // existing labels remain intact.
    expect(revelationSourceRecordLabel("participations")).toBe("participation record");
  });
});

describe("revelationCopy recurrence sections", () => {
  it("states recurrence is a count of records, never a measure of importance, and shown in time order", () => {
    for (const c of [revelationCopy.personRecurrence, revelationCopy.organizationRecurrence]) {
      expect(c.whatThisShows.toLowerCase()).toContain("not a measure of activity or standing");
      expect(c.whatThisShows.toLowerCase()).toContain("never ranked");
      expect(c.limits.toLowerCase()).toContain("documented recurrence, not the true one");
      expect(c.limits.toLowerCase()).toContain("never a measure of activity");
      expect(c.empty.description.toLowerCase()).toContain("a single documented occurrence is not recurrence");
    }
  });

  it("contains no similarity, ranking, prediction, or importance vocabulary", () => {
    const text = JSON.stringify([
      revelationCopy.personRecurrence,
      revelationCopy.organizationRecurrence,
      describeRecurrenceGroup(group("role", "Director", 3, "Alpha Station")),
      describeRecurrenceGroup(group("event", "Expedition", 4)),
    ]).toLowerCase();
    for (const term of [
      "similar",
      "cluster",
      "pattern",
      "predict",
      "embed",
      "recommend",
      "suggest",
      "frequent",
      "prolific",
      "prominent",
      "notable",
      "influence",
      "importance",
      "important",
      "significant",
      "prestige",
      "popular",
      "ranking",
      "leaderboard",
      "top ",
      "most ",
      "trending",
      "central",
    ]) {
      expect(text).not.toContain(term);
    }
  });

  it("contains no PDBFF/institution-specific language (Node Independence)", () => {
    const text = JSON.stringify([
      revelationCopy.personRecurrence,
      revelationCopy.organizationRecurrence,
    ]).toLowerCase();
    for (const term of ["pdbff", "netpdbff", "amazon", "manaus", "mateiro"]) {
      expect(text).not.toContain(term);
    }
  });
});
