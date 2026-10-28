import { describe, expect, it } from "vitest";

import { buildRevelationHighlights, claimRevelationSentence } from "@/features/revelation/highlights";
import { parseRelationshipDocument } from "@/features/relationships/parse";
import type { PersonCohortsDocument, PersonMentorshipLineageDocument, PersonRecurrenceDocument } from "@/features/revelation/types";

const ME = "p0";
const n = (id: string) => ({ type: "person", id, label: id, secondaryLabel: null, href: null, verificationStatus: null });

const cohorts = {
  personId: ME,
  cohorts: [
    { organization: n("o1"), focalParticipations: [], members: [{ person: n("a") }, { person: n("b") }] },
    { organization: n("o2"), focalParticipations: [], members: [{ person: n("b") }, { person: n("c") }] },
  ],
} as unknown as PersonCohortsDocument;

const lineage = {
  personId: ME,
  person: n(ME),
  upstream: [{ from: n("m1"), to: n(ME), depth: 1 }, { from: n("m0"), to: n("m1"), depth: 2 }],
  downstream: [
    { from: n(ME), to: n("s1"), depth: 1 },
    { from: n(ME), to: n("s2"), depth: 1 },
    { from: n("s1"), to: n("g1"), depth: 2 },
  ],
} as unknown as PersonMentorshipLineageDocument;

const recurrence = { personId: ME, person: n(ME), groups: [{}, {}] } as unknown as PersonRecurrenceDocument;

describe("revelation highlights", () => {
  it("counts documented things only, skipping zeros", () => {
    const h = buildRevelationHighlights(ME, cohorts, lineage, recurrence);
    expect(Object.fromEntries(h.map((x) => [x.key, x.value]))).toEqual({
      alongside: 3,
      mentors: 1,
      descendants: 3,
      generations: 2,
      recurrence: 2,
    });
    expect(buildRevelationHighlights(ME, null, null, null)).toEqual([]);
  });

  it("links every fact to the section that shows its records", () => {
    for (const h of buildRevelationHighlights(ME, cohorts, lineage, recurrence)) {
      expect(h.href.startsWith("#")).toBe(true);
    }
  });

  it("never uses ranking or similarity words", () => {
    const text = buildRevelationHighlights(ME, cohorts, lineage, recurrence)
      .map((h) => h.label)
      .concat(claimRevelationSentence(buildRevelationHighlights(ME, cohorts, lineage, recurrence)) ?? "")
      .join(" ")
      .toLowerCase();
    for (const word of ["rank", "score", "similar", "influen", "most ", "top ", "best"]) {
      expect(text.includes(word)).toBe(false);
    }
  });

  it("writes the claim sentence", () => {
    expect(claimRevelationSentence(buildRevelationHighlights(ME, cohorts, lineage, recurrence))).toBe(
      "Your record documents 3 academic descendants, 3 people documented alongside you and 1 mentor.",
    );
    expect(claimRevelationSentence([])).toBeNull();
  });
});

describe("hiding a link from one's page", () => {
  it("reads the hidden and canHide flags", () => {
    const doc = parseRelationshipDocument({
      person_id: ME,
      relationships: [
        {
          id: "r1",
          kind: { key: "collaboration", label: "Collaboration", is_directional: false },
          counterpart: { id: "c1", display_name: "C One" },
          perspective: { person_role_label: "Collaborator", counterpart_role_label: "Collaborator", counterpart_role_label_plural: "Collaborators", direction: "symmetric" },
          narrative: null,
          temporal: { date_is_unknown: true },
          provenance: { source_type: "imported_historical", verification_status: "provisional" },
          hidden: true,
          canHide: true,
        },
      ],
    });
    const rel = doc?.relationships?.[0];
    if (rel) {
      expect(rel.hidden).toBe(true);
      expect(rel.canHide).toBe(true);
    }
  });
});
