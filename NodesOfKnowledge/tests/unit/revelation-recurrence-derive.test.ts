import { describe, expect, it } from "vitest";

import {
  buildOrganizationRecurrenceView,
  buildPersonRecurrenceView,
} from "../../src/features/revelation/derive";
import type {
  OrganizationRecurrenceDocument,
  PersonRecurrenceDocument,
  RecurrenceGroup,
} from "../../src/features/revelation/types";

// Pure derivation tests for M8.5. The read model already applied the >= 2 rule
// and the neutral ordering; derive only decides whether anything was revealed and
// preserves the order (never re-ordering by count).

function group(category: RecurrenceGroup["category"], label: string, count: number): RecurrenceGroup {
  return {
    category,
    label,
    anchor:
      category === "role"
        ? {
            type: "organization",
            id: "o1",
            label: "Org",
            secondaryLabel: null,
            href: "/institutions/o1",
            verificationStatus: "provisional",
          }
        : null,
    count,
    occurrences: Array.from({ length: count }, (_unused, i) => ({
      source: { type: "participations", id: `s${i}` },
      node: null,
      temporal: {
        startDate: `${1980 + i}-01-01`,
        startPrecision: "year",
        endDate: null,
        endPrecision: null,
        isApproximate: false,
        isOngoing: false,
        dateIsUnknown: false,
        dateIsUncertain: false,
      },
      provenance: { sourceType: "imported_historical", verificationStatus: "provisional" },
    })),
  };
}

function personDoc(groups: RecurrenceGroup[]): PersonRecurrenceDocument {
  return {
    personId: "p1",
    person: {
      type: "person",
      id: "p1",
      label: "Ana",
      secondaryLabel: null,
      href: "/people/p1",
      verificationStatus: "provisional",
    },
    groups,
  };
}
function orgDoc(groups: RecurrenceGroup[]): OrganizationRecurrenceDocument {
  return {
    organizationId: "o1",
    organization: {
      type: "organization",
      id: "o1",
      label: "Org",
      secondaryLabel: null,
      href: "/institutions/o1",
      verificationStatus: "provisional",
    },
    groups,
  };
}

describe("buildPersonRecurrenceView / buildOrganizationRecurrenceView", () => {
  it("reads a null document and an empty groups array as the same honest absence", () => {
    expect(buildPersonRecurrenceView(null).isEmpty).toBe(true);
    expect(buildPersonRecurrenceView(personDoc([])).isEmpty).toBe(true);
    expect(buildOrganizationRecurrenceView(null).isEmpty).toBe(true);
    expect(buildOrganizationRecurrenceView(orgDoc([])).isEmpty).toBe(true);
  });

  it("surfaces groups when present, preserving the read model's order (never re-ordered by count)", () => {
    // a lower-count group is given FIRST; the view must keep that order, proving
    // it never sorts by count.
    const view = buildPersonRecurrenceView(
      personDoc([group("role", "Director", 2), group("event", "Expedition", 5)]),
    );
    expect(view.isEmpty).toBe(false);
    expect(view.groups.length).toBe(2);
    expect(view.groups[0].count).toBe(2);
    expect(view.groups[1].count).toBe(5);
  });
});
