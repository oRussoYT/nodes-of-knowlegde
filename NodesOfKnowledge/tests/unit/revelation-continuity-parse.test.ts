import { describe, expect, it } from "vitest";

import { parseOrganizationContinuityDocument } from "../../src/features/revelation/parse-continuity";

// Fail-closed parser tests for the M8.4 continuity document. The parser only ever
// REMOVES an unrecognizable element (a bad span, participation, gap) and never
// invents; a whole document fails only when its identity/organization/status is
// unshaped. The four honest states are NOT decided here.

function participation(id: string, personId: string) {
  return {
    person: {
      type: "person",
      id: personId,
      label: `Person ${personId}`,
      secondary_label: null,
      href: `/people/${personId}`,
      verification_status: "provisional",
    },
    temporal: {
      start_date: "1970-01-01",
      start_precision: "year",
      end_date: "1975-12-31",
      end_precision: "year",
      is_approximate: false,
      is_ongoing: false,
      date_is_unknown: false,
      date_is_uncertain: false,
    },
    provenance: { source_type: "imported_historical", verification_status: "provisional" },
    source: { type: "participations", id },
  };
}

function baseDoc() {
  return {
    organization_id: "org1",
    organization: {
      type: "organization",
      id: "org1",
      label: "Focal Station",
      secondary_label: "FS",
      href: "/institutions/org1",
      verification_status: "provisional",
    },
    status: { key: "active", status_category: "active" },
    closure: null,
    practices: [
      {
        capacity: { key: "researcher", label: "Researcher" },
        spans: [
          { start_year: 1970, end_year: 1980, is_open: false, participations: [participation("pa1", "p1")] },
        ],
        gaps: [],
      },
    ],
  };
}

describe("parseOrganizationContinuityDocument", () => {
  it("parses a well-formed document into the typed projection", () => {
    const doc = parseOrganizationContinuityDocument(baseDoc());
    expect(doc).not.toBeNull();
    expect(doc?.organizationId).toBe("org1");
    expect(doc?.organization.type).toBe("organization");
    expect(doc?.status.key).toBe("active");
    expect(doc?.status.category).toBe("active");
    expect(doc?.closure).toBeNull();
    expect(doc?.practices.length).toBe(1);
    expect(doc?.practices[0].capacity.key).toBe("researcher");
    expect(doc?.practices[0].spans[0].startYear).toBe(1970);
    expect(doc?.practices[0].spans[0].endYear).toBe(1980);
    expect(doc?.practices[0].spans[0].isOpen).toBe(false);
    expect(doc?.practices[0].spans[0].participations[0].source.id).toBe("pa1");
  });

  it("returns null on a non-record, a missing id, a mistyped organization, or a missing status", () => {
    expect(parseOrganizationContinuityDocument(null)).toBeNull();
    expect(parseOrganizationContinuityDocument("x")).toBeNull();
    const noId = baseDoc();
    (noId as { organization_id?: unknown }).organization_id = 5;
    expect(parseOrganizationContinuityDocument(noId)).toBeNull();
    const badOrg = baseDoc();
    badOrg.organization.type = "person";
    expect(parseOrganizationContinuityDocument(badOrg)).toBeNull();
    const noStatus = baseDoc();
    (noStatus as { status?: unknown }).status = { key: "" };
    expect(parseOrganizationContinuityDocument(noStatus)).toBeNull();
  });

  it("degrades an unrecognizable status category to 'unknown' but keeps the explicit key", () => {
    const d = baseDoc();
    d.status = { key: "some_new_key", status_category: "nonsense" };
    const doc = parseOrganizationContinuityDocument(d);
    expect(doc?.status.key).toBe("some_new_key");
    expect(doc?.status.category).toBe("unknown");
  });

  it("parses an open span (null end year) and rejects a span whose open flag disagrees with its end year", () => {
    const openOk = baseDoc();
    openOk.practices[0].spans = [
      { start_year: 1990, end_year: null, is_open: true, participations: [participation("pa2", "p2")] },
    ];
    expect(parseOrganizationContinuityDocument(openOk)?.practices[0].spans[0].isOpen).toBe(true);

    // open with an end year -> contradiction -> span dropped -> practice (its only
    // span gone) dropped -> practices empty (never invented).
    const openBad = baseDoc();
    openBad.practices[0].spans = [
      { start_year: 1990, end_year: 1995, is_open: true, participations: [participation("pa3", "p3")] },
    ];
    expect(parseOrganizationContinuityDocument(openBad)?.practices.length).toBe(0);

    // closed with a null end year -> contradiction -> dropped likewise.
    const closedBad = baseDoc();
    closedBad.practices[0].spans = [
      { start_year: 1990, end_year: null, is_open: false, participations: [participation("pa4", "p4")] },
    ];
    expect(parseOrganizationContinuityDocument(closedBad)?.practices.length).toBe(0);
  });

  it("drops a participation missing its canonical source, and the span if that empties it", () => {
    const d = baseDoc();
    const p = participation("pa5", "p5") as { source?: unknown };
    delete p.source;
    d.practices[0].spans = [
      { start_year: 1970, end_year: 1980, is_open: false, participations: [p] },
    ];
    // the only participation is unshaped -> span has no decomposable record -> dropped.
    expect(parseOrganizationContinuityDocument(d)?.practices.length).toBe(0);
  });

  it("drops a malformed gap but keeps the practice's valid spans", () => {
    const d = baseDoc();
    d.practices[0].spans = [
      { start_year: 1960, end_year: 1965, is_open: false, participations: [participation("pa6", "p6")] },
      { start_year: 1980, end_year: 1985, is_open: false, participations: [participation("pa7", "p7")] },
    ];
    d.practices[0].gaps = [
      { from_year: 1965, to_year: 1980 },
      { from_year: "oops" as unknown as number, to_year: 1980 },
    ];
    const doc = parseOrganizationContinuityDocument(d);
    expect(doc?.practices[0].spans.length).toBe(2);
    expect(doc?.practices[0].gaps.length).toBe(1);
    expect(doc?.practices[0].gaps[0].fromYear).toBe(1965);
  });

  it("parses a closure moment, and degrades a malformed closure to null without failing the document", () => {
    const withClosure = baseDoc();
    withClosure.status = { key: "closed", status_category: "ended" };
    (withClosure as { closure?: unknown }).closure = { date: "1998-06-01", precision: "month" };
    const a = parseOrganizationContinuityDocument(withClosure);
    expect(a?.closure?.date).toBe("1998-06-01");
    expect(a?.closure?.precision).toBe("month");

    const badClosure = baseDoc();
    (badClosure as { closure?: unknown }).closure = { precision: "month" };
    const b = parseOrganizationContinuityDocument(badClosure);
    expect(b).not.toBeNull();
    expect(b?.closure).toBeNull();
  });
});
