import { describe, expect, it } from "vitest";

import {
  parseOrganizationRecurrenceDocument,
  parsePersonRecurrenceDocument,
} from "../../src/features/revelation/parse-recurrence";

// Fail-closed parser tests for the M8.5 recurrence documents. The parser only
// ever REMOVES an unrecognizable occurrence or group and never invents; a group
// needs >= 2 decomposable occurrences (recurrence is never "once"), and the
// reported count is set to the surviving occurrences so it can never overstate
// what a reader can decompose.

function occurrence(sourceType: string, id: string, node: unknown, undated = false) {
  return {
    source: { type: sourceType, id },
    node,
    temporal: {
      start_date: undated ? null : "1980-01-01",
      start_precision: undated ? null : "year",
      end_date: null,
      end_precision: null,
      is_approximate: false,
      is_ongoing: false,
      date_is_unknown: undated,
      date_is_uncertain: false,
    },
    provenance: { source_type: "imported_historical", verification_status: "provisional" },
  };
}

function orgNode(id: string) {
  return {
    type: "organization",
    id,
    label: `Org ${id}`,
    secondary_label: null,
    href: `/institutions/${id}`,
    verification_status: "provisional",
  };
}
function contributionNode(id: string) {
  return {
    type: "contribution",
    id,
    label: `Contribution ${id}`,
    secondary_label: null,
    href: `/contributions/${id}`,
    verification_status: "provisional",
  };
}
function eventNode(id: string) {
  return {
    type: "event",
    id,
    label: `Event ${id}`,
    secondary_label: null,
    href: null,
    verification_status: "provisional",
  };
}

function personDoc() {
  return {
    person_id: "p1",
    person: {
      type: "person",
      id: "p1",
      label: "Ana Alpha",
      secondary_label: null,
      href: "/people/p1",
      verification_status: "provisional",
    },
    groups: [
      {
        category: "role",
        label: "Director",
        anchor: orgNode("o1"),
        count: 2,
        occurrences: [occurrence("participations", "pa1", null), occurrence("participations", "pa2", null)],
      },
      {
        category: "contribution",
        label: "Publication",
        anchor: null,
        count: 2,
        occurrences: [
          occurrence("contributions", "c1", contributionNode("c1")),
          occurrence("contributions", "c2", contributionNode("c2")),
        ],
      },
    ],
  };
}

describe("parsePersonRecurrenceDocument", () => {
  it("parses a well-formed document into the typed projection", () => {
    const doc = parsePersonRecurrenceDocument(personDoc());
    expect(doc).not.toBeNull();
    expect(doc?.personId).toBe("p1");
    expect(doc?.person.type).toBe("person");
    expect(doc?.groups.length).toBe(2);
    expect(doc?.groups[0].category).toBe("role");
    expect(doc?.groups[0].anchor?.type).toBe("organization");
    expect(doc?.groups[0].count).toBe(2);
    expect(doc?.groups[1].occurrences[0].node?.type).toBe("contribution");
    expect(doc?.groups[1].occurrences[0].node?.href).toBe("/contributions/c1");
  });

  it("returns null on a non-record, a missing id, or a mistyped focal node", () => {
    expect(parsePersonRecurrenceDocument(null)).toBeNull();
    const badId = personDoc();
    (badId as { person_id?: unknown }).person_id = 7;
    expect(parsePersonRecurrenceDocument(badId)).toBeNull();
    const badFocal = personDoc();
    badFocal.person.type = "organization";
    expect(parsePersonRecurrenceDocument(badFocal)).toBeNull();
  });

  it("drops a group with fewer than two decomposable occurrences (recurrence is never 'once')", () => {
    const d = personDoc();
    d.groups[0].occurrences = [occurrence("participations", "pa1", null)];
    const doc = parsePersonRecurrenceDocument(d);
    // role group drops to one occurrence -> removed; contribution group survives.
    expect(doc?.groups.length).toBe(1);
    expect(doc?.groups[0].category).toBe("contribution");
  });

  it("sets count to the number of surviving occurrences, never overstating decomposable evidence", () => {
    const d = personDoc();
    // three occurrences but one malformed (missing source) -> two survive -> count 2.
    const bad = occurrence("participations", "pa3", null) as { source?: unknown };
    delete bad.source;
    d.groups[0].count = 3;
    d.groups[0].occurrences = [
      occurrence("participations", "pa1", null),
      occurrence("participations", "pa2", null),
      bad,
    ];
    const doc = parsePersonRecurrenceDocument(d);
    const role = doc?.groups.find((g) => g.category === "role");
    expect(role?.count).toBe(2);
    expect(role?.occurrences.length).toBe(2);
  });

  it("deduplicates occurrences by canonical source id, so a duplicated record cannot fabricate a recurrence", () => {
    const d = personDoc();
    // The SAME participations row appears twice (an upstream JOIN fan-out). It is
    // ONE distinct record, so the role group falls to a single distinct occurrence
    // and is removed -- a duplicated row never manufactures a recurrence.
    d.groups[0].count = 2;
    d.groups[0].occurrences = [
      occurrence("participations", "pa1", null),
      occurrence("participations", "pa1", null),
    ];
    const doc = parsePersonRecurrenceDocument(d);
    expect(doc?.groups.some((g) => g.category === "role")).toBe(false);
  });

  it("counts only DISTINCT sources when some occurrences are duplicates", () => {
    const d = personDoc();
    // Three rows, but two share a source id -> two distinct records -> count 2.
    d.groups[1].count = 3;
    d.groups[1].occurrences = [
      occurrence("contributions", "c1", contributionNode("c1")),
      occurrence("contributions", "c1", contributionNode("c1")),
      occurrence("contributions", "c2", contributionNode("c2")),
    ];
    const doc = parsePersonRecurrenceDocument(d);
    const contrib = doc?.groups.find((g) => g.category === "contribution");
    expect(contrib?.count).toBe(2);
    expect(contrib?.occurrences.length).toBe(2);
  });

  it("requires a role group to carry an organization anchor", () => {
    const d = personDoc();
    d.groups[0].anchor = null;
    const doc = parsePersonRecurrenceDocument(d);
    // role group without its institution anchor is dropped.
    expect(doc?.groups.some((g) => g.category === "role")).toBe(false);
  });

  it("keeps an undated occurrence as a counted occurrence (unknown dates stay unknown)", () => {
    const d = personDoc();
    d.groups[1].occurrences = [
      occurrence("contributions", "c1", contributionNode("c1")),
      occurrence("contributions", "c2", contributionNode("c2"), true),
    ];
    const doc = parsePersonRecurrenceDocument(d);
    const contrib = doc?.groups.find((g) => g.category === "contribution");
    expect(contrib?.count).toBe(2);
    expect(contrib?.occurrences[1].temporal.dateIsUnknown).toBe(true);
  });

  it("rejects a present-but-malformed occurrence node rather than silently nulling it", () => {
    const d = personDoc();
    const withBadNode = occurrence("contributions", "c3", { type: "contribution", id: "c3", label: "" });
    d.groups[1].occurrences = [
      occurrence("contributions", "c1", contributionNode("c1")),
      withBadNode,
    ];
    const doc = parsePersonRecurrenceDocument(d);
    // one occurrence has a blank-label node -> dropped -> group falls to one -> removed.
    expect(doc?.groups.some((g) => g.category === "contribution")).toBe(false);
  });
});

describe("parseOrganizationRecurrenceDocument", () => {
  it("parses an institution document with event and contribution groups", () => {
    const doc = parseOrganizationRecurrenceDocument({
      organization_id: "o1",
      organization: orgNode("o1"),
      groups: [
        {
          category: "event",
          label: "Expedition",
          anchor: null,
          count: 2,
          occurrences: [
            occurrence("events", "e1", eventNode("e1")),
            occurrence("events", "e2", eventNode("e2")),
          ],
        },
      ],
    });
    expect(doc).not.toBeNull();
    expect(doc?.organization.type).toBe("organization");
    expect(doc?.groups[0].category).toBe("event");
    expect(doc?.groups[0].occurrences[0].node?.type).toBe("event");
    expect(doc?.groups[0].occurrences[0].node?.href).toBeNull();
  });

  it("returns null on a mistyped focal organization node", () => {
    const doc = parseOrganizationRecurrenceDocument({
      organization_id: "o1",
      organization: { ...orgNode("o1"), type: "person" },
      groups: [],
    });
    expect(doc).toBeNull();
  });
});
