import { describe, expect, it } from "vitest";

import { parsePersonCohortsDocument } from "../../src/features/revelation/parse";

const anchor = {
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

const member = {
  person: {
    type: "person",
    id: "p3",
    label: "Cara Stone",
    secondary_label: null,
    href: "/people/p3",
    verification_status: "provisional",
  },
  capacity: { key: "researcher", label: "Researcher" },
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

const cohort = {
  organization: {
    type: "organization",
    id: "o1",
    label: "Alpha Institute",
    secondary_label: "ALP",
    href: "/institutions/o1",
    verification_status: "provisional",
  },
  focal_participations: [anchor],
  members: [member],
};

describe("parsePersonCohortsDocument", () => {
  it("parses a valid document and maps snake_case to camelCase", () => {
    const parsed = parsePersonCohortsDocument({ person_id: "p1", cohorts: [cohort] });
    expect(parsed?.personId).toBe("p1");
    expect(parsed?.cohorts.length).toBe(1);
    const c = parsed?.cohorts[0];
    expect(c?.organization.type).toBe("organization");
    expect(c?.organization.href).toBe("/institutions/o1");
    expect(c?.focalParticipations[0]?.temporal.isOngoing).toBe(true);
    const m = c?.members[0];
    expect(m?.person.id).toBe("p3");
    expect(m?.person.href).toBe("/people/p3");
    expect(m?.capacity.label).toBe("Researcher");
    expect(m?.temporal.startDate).toBe("1992-01-01");
    expect(m?.source.type).toBe("participations");
    expect(m?.source.id).toBe("m_cara");
  });

  it("returns an empty cohorts array for a person with none, not null", () => {
    expect(parsePersonCohortsDocument({ person_id: "p1", cohorts: [] })?.cohorts).toEqual([]);
  });

  it("drops a malformed member but keeps the rest (fail-closed per member)", () => {
    const twoMembers = {
      ...cohort,
      members: [member, { ...member, person: null }],
    };
    const parsed = parsePersonCohortsDocument({ person_id: "p1", cohorts: [twoMembers] });
    expect(parsed?.cohorts[0]?.members.length).toBe(1);
    expect(parsed?.cohorts[0]?.members[0]?.person.id).toBe("p3");
  });

  it("drops a member with a missing source or unrecognizable provenance (no undecomposable member)", () => {
    const badSource = { ...member, source: null };
    const badProvenance = { ...member, provenance: { source_type: "nope", verification_status: "nope" } };
    const parsed = parsePersonCohortsDocument({
      person_id: "p1",
      cohorts: [{ ...cohort, members: [badSource, badProvenance, member] }],
    });
    expect(parsed?.cohorts[0]?.members.length).toBe(1);
    expect(parsed?.cohorts[0]?.members[0]?.source.id).toBe("m_cara");
  });

  it("drops a cohort whose members are all unreadable (never renders an empty group)", () => {
    const parsed = parsePersonCohortsDocument({
      person_id: "p1",
      cohorts: [{ ...cohort, members: [{ ...member, person: null }] }],
    });
    expect(parsed?.cohorts.length).toBe(0);
  });

  it("rejects a member node that is not a person, or an organization node that is not an organization", () => {
    const memberAsOrg = { ...member, person: { ...member.person, type: "organization" } };
    const parsedMember = parsePersonCohortsDocument({
      person_id: "p1",
      cohorts: [{ ...cohort, members: [memberAsOrg] }],
    });
    expect(parsedMember?.cohorts.length).toBe(0);

    const orgAsPerson = { ...cohort, organization: { ...cohort.organization, type: "person" } };
    const parsedOrg = parsePersonCohortsDocument({ person_id: "p1", cohorts: [orgAsPerson] });
    expect(parsedOrg?.cohorts.length).toBe(0);
  });

  it("keeps a cohort with an empty focal_participations array (still valid)", () => {
    const parsed = parsePersonCohortsDocument({
      person_id: "p1",
      cohorts: [{ ...cohort, focal_participations: [] }],
    });
    expect(parsed?.cohorts[0]?.focalParticipations).toEqual([]);
    expect(parsed?.cohorts[0]?.members.length).toBe(1);
  });

  it("returns null for non-record input or a missing person_id / cohorts", () => {
    expect(parsePersonCohortsDocument(null)).toBeNull();
    expect(parsePersonCohortsDocument({ cohorts: [] })).toBeNull();
    expect(parsePersonCohortsDocument({ person_id: "p1" })).toBeNull();
  });
});
