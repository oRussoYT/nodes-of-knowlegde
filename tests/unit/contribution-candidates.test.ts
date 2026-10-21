import { describe, expect, it } from "vitest";

import {
  parseContributionOptions,
  parseMyCandidates,
  parseQueue,
  readProposalForm,
} from "../../src/features/contribution-candidates/parse";

describe("contribution proposals", () => {
  it("reads the form vocabularies", () => {
    const o = parseContributionOptions({ kinds: [{ key: "training", label: "Training" }, { key: "" }], capacities: [] });
    expect(o.kinds).toEqual([{ key: "training", label: "Training" }]);
    expect(parseContributionOptions(null)).toEqual({ kinds: [], capacities: [] });
  });

  it("keeps a proposal's status and the steward's note", () => {
    const mine = parseMyCandidates([
      { id: "c1", person_id: "p1", title: "Protocol", status: "rejected", decision_note: "No source found", contribution_id: null },
      { id: "c2", person_id: "p1", title: "Bad", status: "maybe" },
    ]);
    expect(mine).toHaveLength(1);
    expect(mine[0]?.decisionNote).toBe("No source found");
  });

  it("only queues proposals that say what documents them", () => {
    const q = parseQueue([
      { id: "c1", person_id: "p1", display_name: "Mae Field", title: "Protocol", source_note: "MSc thesis", source_type: "self_reported", is_own_proposal: false },
      { id: "c2", person_id: "p1", display_name: "Mae Field", title: "No source" },
    ]);
    expect(q.map((c) => c.id)).toEqual(["c1"]);
    expect(q[0]?.toldByThePerson).toBe(true);
  });

  it("validates the form", () => {
    const base = { title: " Trail map ", kind: "field_infrastructure", capacity: "technical_construction", sourceNote: "Archive box 3", description: "", startYear: "", endYear: "" };
    const ok = readProposalForm(base);
    expect(ok.ok && ok.value.title).toBe("Trail map");
    expect(readProposalForm({ ...base, sourceNote: " " }).ok).toBe(false);
    expect(readProposalForm({ ...base, endYear: "2000" }).ok).toBe(false);
    expect(readProposalForm({ ...base, startYear: "2001", endYear: "2000" }).ok).toBe(false);
  });
});
