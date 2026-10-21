import { describe, expect, it } from "vitest";

import {
  parseOrganizationLineageDocument,
  parsePersonMentorshipLineageDocument,
} from "../../src/features/revelation/parse-lineage";

const temporal = {
  start_date: "1970-01-01",
  start_precision: "year",
  end_date: null,
  end_precision: null,
  is_approximate: false,
  is_ongoing: false,
  date_is_unknown: false,
  date_is_uncertain: false,
};

const orgStep = {
  source: { type: "organization_relationships", id: "rel-1" },
  kind: { key: "succession", label: "Succession", source_role: "Predecessor" },
  from: {
    type: "organization",
    id: "o-old",
    label: "Old Station",
    secondary_label: "OS",
    href: "/institutions/o-old",
    verification_status: "provisional",
  },
  to: {
    type: "organization",
    id: "o-new",
    label: "New Institute",
    secondary_label: null,
    href: "/institutions/o-new",
    verification_status: "provisional",
  },
  temporal,
  provenance: { source_type: "imported_historical", verification_status: "provisional" },
  direction: "upstream",
  depth: 1,
};

function orgDoc(overrides: Record<string, unknown> = {}) {
  return {
    organization_id: "o-new",
    organization: {
      type: "organization",
      id: "o-new",
      label: "New Institute",
      secondary_label: null,
      href: "/institutions/o-new",
      verification_status: "provisional",
    },
    upstream: [orgStep],
    downstream: [],
    ...overrides,
  };
}

describe("parseOrganizationLineageDocument", () => {
  it("parses a valid document and maps snake_case to camelCase", () => {
    const parsed = parseOrganizationLineageDocument(orgDoc());
    expect(parsed?.organizationId).toBe("o-new");
    expect(parsed?.organization.type).toBe("organization");
    expect(parsed?.downstream).toEqual([]);
    const step = parsed?.upstream[0];
    expect(step?.kind.sourceRole).toBe("Predecessor");
    expect(step?.from.id).toBe("o-old");
    expect(step?.to.id).toBe("o-new");
    expect(step?.direction).toBe("upstream");
    expect(step?.depth).toBe(1);
    expect(step?.source.type).toBe("organization_relationships");
    expect(step?.source.id).toBe("rel-1");
    expect(step?.temporal.startDate).toBe("1970-01-01");
  });

  it("drops a step with a missing/mistyped endpoint, a missing source, a bad direction, or a non-numeric depth", () => {
    const bad = [
      { ...orgStep, from: null },
      { ...orgStep, from: { ...orgStep.from, type: "person" } },
      { ...orgStep, source: null },
      { ...orgStep, direction: "sideways" },
      { ...orgStep, depth: "1" },
      { ...orgStep, kind: { key: "succession", label: "Succession" } }, // missing source_role
    ];
    const parsed = parseOrganizationLineageDocument(orgDoc({ upstream: [...bad, orgStep] }));
    expect(parsed?.upstream.length).toBe(1);
    expect(parsed?.upstream[0]?.source.id).toBe("rel-1");
  });

  it("returns null when upstream/downstream is not an array, or the organization node is wrong", () => {
    expect(parseOrganizationLineageDocument(orgDoc({ upstream: null }))).toBeNull();
    expect(parseOrganizationLineageDocument(orgDoc({ downstream: 5 }))).toBeNull();
    expect(
      parseOrganizationLineageDocument(orgDoc({ organization: { ...orgStep.from, type: "person" } })),
    ).toBeNull();
  });

  it("returns null for non-record input or a missing organization_id", () => {
    expect(parseOrganizationLineageDocument(null)).toBeNull();
    expect(parseOrganizationLineageDocument({ organization: orgStep.from, upstream: [], downstream: [] })).toBeNull();
  });

  it("treats empty upstream and downstream as a valid empty document", () => {
    const parsed = parseOrganizationLineageDocument(orgDoc({ upstream: [], downstream: [] }));
    expect(parsed?.upstream).toEqual([]);
    expect(parsed?.downstream).toEqual([]);
  });
});

const personStep = {
  source: { type: "relationships", id: "m-1" },
  kind: { key: "mentorship", label: "Mentorship", source_role: "Mentor" },
  from: {
    type: "person",
    id: "p-mentor",
    label: "A Mentor",
    secondary_label: null,
    href: "/people/p-mentor",
    verification_status: "provisional",
  },
  to: {
    type: "person",
    id: "p-focal",
    label: "The Focal",
    secondary_label: null,
    href: "/people/p-focal",
    verification_status: "provisional",
  },
  temporal,
  provenance: { source_type: "imported_historical", verification_status: "provisional" },
  direction: "upstream",
  depth: 1,
};

describe("parsePersonMentorshipLineageDocument", () => {
  it("parses a valid mentorship document with person endpoints", () => {
    const parsed = parsePersonMentorshipLineageDocument({
      person_id: "p-focal",
      person: personStep.to,
      upstream: [personStep],
      downstream: [],
    });
    expect(parsed?.personId).toBe("p-focal");
    expect(parsed?.upstream[0]?.kind.sourceRole).toBe("Mentor");
    expect(parsed?.upstream[0]?.from.id).toBe("p-mentor");
  });

  it("rejects an org endpoint in a mentorship step (person lineage is person->person)", () => {
    const orgEndpoint = { ...personStep, from: { ...personStep.from, type: "organization" } };
    const parsed = parsePersonMentorshipLineageDocument({
      person_id: "p-focal",
      person: personStep.to,
      upstream: [orgEndpoint],
      downstream: [],
    });
    expect(parsed?.upstream.length).toBe(0);
  });
});
