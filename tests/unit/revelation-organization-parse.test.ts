import { describe, expect, it } from "vitest";

import { parseOrganizationGenerationsDocument } from "../../src/features/revelation/parse-organization";

const participation = {
  id: "pf1",
  capacity: { key: "researcher", label: "Researcher" },
  temporal: {
    start_date: "1990-01-01",
    start_precision: "year",
    end_date: null,
    end_precision: null,
    is_approximate: false,
    is_ongoing: true,
    date_is_unknown: false,
    date_is_uncertain: false,
  },
  provenance: { source_type: "imported_historical", verification_status: "provisional" },
};

const coPresent = {
  person: {
    type: "person",
    id: "p3",
    label: "Cara Stone",
    secondary_label: null,
    href: "/people/p3",
    verification_status: "provisional",
  },
  capacity: { key: "field_assistant", label: "Field assistant" },
  temporal: {
    start_date: "1992-01-01",
    start_precision: "year",
    end_date: null,
    end_precision: null,
    is_approximate: false,
    is_ongoing: true,
    date_is_unknown: false,
    date_is_uncertain: false,
  },
  provenance: { source_type: "imported_historical", verification_status: "provisional" },
  source: { type: "participations", id: "m_cara" },
};

const anchor = {
  person: {
    type: "person",
    id: "p1",
    label: "Focal Faye",
    secondary_label: null,
    href: "/people/p1",
    verification_status: "provisional",
  },
  participations: [participation],
  co_present: [coPresent],
};

const org = {
  type: "organization",
  id: "o1",
  label: "Alpha Institute",
  secondary_label: "ALP",
  href: "/institutions/o1",
  verification_status: "provisional",
};

function doc(overrides: Record<string, unknown> = {}) {
  return { organization_id: "o1", organization: org, anchors: [anchor], ...overrides };
}

describe("parseOrganizationGenerationsDocument", () => {
  it("parses a valid document and maps snake_case to camelCase", () => {
    const parsed = parseOrganizationGenerationsDocument(doc());
    expect(parsed?.organizationId).toBe("o1");
    expect(parsed?.organization.type).toBe("organization");
    expect(parsed?.organization.href).toBe("/institutions/o1");
    expect(parsed?.anchors.length).toBe(1);
    const a = parsed?.anchors[0];
    expect(a?.person.id).toBe("p1");
    expect(a?.person.href).toBe("/people/p1");
    expect(a?.participations[0]?.temporal.isOngoing).toBe(true);
    const m = a?.coPresent[0];
    expect(m?.person.id).toBe("p3");
    expect(m?.capacity.label).toBe("Field assistant");
    expect(m?.temporal.startDate).toBe("1992-01-01");
    expect(m?.source.type).toBe("participations");
    expect(m?.source.id).toBe("m_cara");
  });

  it("returns an empty anchors array for an institution with no co-presence, not null", () => {
    expect(parseOrganizationGenerationsDocument(doc({ anchors: [] }))?.anchors).toEqual([]);
  });

  it("drops a malformed co-present member but keeps the rest (fail-closed per member)", () => {
    const twoMembers = { ...anchor, co_present: [coPresent, { ...coPresent, person: null }] };
    const parsed = parseOrganizationGenerationsDocument(doc({ anchors: [twoMembers] }));
    expect(parsed?.anchors[0]?.coPresent.length).toBe(1);
    expect(parsed?.anchors[0]?.coPresent[0]?.person.id).toBe("p3");
  });

  it("drops a co-present member with a missing source (no undecomposable member)", () => {
    const badSource = { ...coPresent, source: null };
    const parsed = parseOrganizationGenerationsDocument(
      doc({ anchors: [{ ...anchor, co_present: [badSource, coPresent] }] }),
    );
    expect(parsed?.anchors[0]?.coPresent.length).toBe(1);
    expect(parsed?.anchors[0]?.coPresent[0]?.source.id).toBe("m_cara");
  });

  it("drops an anchor whose co-present set is entirely unreadable (never an empty anchor)", () => {
    const parsed = parseOrganizationGenerationsDocument(
      doc({ anchors: [{ ...anchor, co_present: [{ ...coPresent, person: null }] }] }),
    );
    expect(parsed?.anchors.length).toBe(0);
  });

  it("drops an anchor with no readable participation (both sides must be decomposable)", () => {
    const parsed = parseOrganizationGenerationsDocument(
      doc({ anchors: [{ ...anchor, participations: [] }] }),
    );
    expect(parsed?.anchors.length).toBe(0);
  });

  it("rejects an anchor node that is not a person, or an organization node that is not an organization", () => {
    const anchorAsOrg = { ...anchor, person: { ...anchor.person, type: "organization" } };
    expect(parseOrganizationGenerationsDocument(doc({ anchors: [anchorAsOrg] }))?.anchors.length).toBe(0);

    const orgAsPerson = { ...org, type: "person" };
    expect(parseOrganizationGenerationsDocument(doc({ organization: orgAsPerson }))).toBeNull();
  });

  it("returns null for non-record input or a missing organization_id / organization / anchors", () => {
    expect(parseOrganizationGenerationsDocument(null)).toBeNull();
    expect(parseOrganizationGenerationsDocument({ organization: org, anchors: [] })).toBeNull();
    expect(parseOrganizationGenerationsDocument({ organization_id: "o1", anchors: [] })).toBeNull();
    expect(parseOrganizationGenerationsDocument({ organization_id: "o1", organization: org })).toBeNull();
  });
});
