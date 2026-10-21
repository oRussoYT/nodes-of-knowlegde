import { describe, expect, it } from "vitest";

import { parsePersonPathwayDocument } from "../../src/features/revelation/parse-pathway";

// Fail-closed parser tests for the M8.6 bounded-pathway document. The pathway-
// specific rule: a chain must be COMPLETE (count agrees), >= 2 steps, and
// CONTIGUOUS (focal -> ... -> target); any break degrades the document to
// found:false with no steps -- a broken chain is never shown as a pathway.

function node(type: string, id: string, href: string | null) {
  return { type, id, label: `${type} ${id}`, secondary_label: null, href, verification_status: "provisional" };
}
function temporal() {
  return {
    start_date: "1980-01-01", start_precision: "year", end_date: null, end_precision: null,
    is_approximate: false, is_ongoing: false, date_is_unknown: false, date_is_uncertain: false,
  };
}
function step(sid: string, category: string, label: string, from: unknown, to: unknown) {
  return {
    source: { type: "participations", id: sid },
    category, label, from, to, temporal: temporal(),
    provenance: { source_type: "imported_historical", verification_status: "provisional" },
  };
}
// Contiguous chain p1 -> o1 -> c1 (participation, contribution).
function validDoc() {
  const p1 = node("person", "p1", "/people/p1");
  const o1 = node("organization", "o1", "/institutions/o1");
  const c1 = node("contribution", "c1", "/contributions/c1");
  return {
    from_id: "p1", from: p1, to_id: "c1", to: c1,
    target_resolved: true, found: true, step_count: 2,
    steps: [step("s1", "participation", "Researcher", p1, o1), step("s2", "contribution", "Author", o1, c1)],
  };
}

describe("parsePersonPathwayDocument", () => {
  it("parses a complete, contiguous chain", () => {
    const doc = parsePersonPathwayDocument(validDoc());
    expect(doc).not.toBeNull();
    expect(doc?.found).toBe(true);
    expect(doc?.targetResolved).toBe(true);
    expect(doc?.stepCount).toBe(2);
    expect(doc?.steps.length).toBe(2);
    expect(doc?.steps[0].from.type).toBe("person");
    expect(doc?.steps[1].to.type).toBe("contribution");
  });

  it("returns null on a non-record, a missing from_id, or a mistyped focal node", () => {
    expect(parsePersonPathwayDocument(null)).toBeNull();
    const badId = validDoc();
    (badId as { from_id?: unknown }).from_id = 5;
    expect(parsePersonPathwayDocument(badId)).toBeNull();
    const badFocal = validDoc();
    badFocal.from.type = "organization";
    expect(parsePersonPathwayDocument(badFocal)).toBeNull();
  });

  it("degrades a NON-CONTIGUOUS chain to an honest no-chain document", () => {
    const d = validDoc();
    // break the join: step 2 now starts from a different node than step 1 ended.
    d.steps[1].from = node("organization", "oX", "/institutions/oX");
    const doc = parsePersonPathwayDocument(d);
    expect(doc?.found).toBe(false);
    expect(doc?.steps.length).toBe(0);
    expect(doc?.targetResolved).toBe(true);
  });

  it("degrades when the declared count disagrees with the steps shown", () => {
    const d = validDoc();
    d.step_count = 3;
    expect(parsePersonPathwayDocument(d)?.found).toBe(false);
  });

  it("degrades a chain of fewer than two steps (a one-step link is a connection, not a pathway)", () => {
    const p1 = node("person", "p1", "/people/p1");
    const p2 = node("person", "p2", "/people/p2");
    const d = validDoc();
    d.to_id = "p2"; d.to = p2; d.step_count = 1;
    d.steps = [step("s1", "relationship", "Collaboration", p1, p2)];
    expect(parsePersonPathwayDocument(d)?.found).toBe(false);
  });

  it("degrades to no-chain when any step is malformed (a broken link is never shown)", () => {
    const d = validDoc();
    const bad = step("s2", "contribution", "Author", node("organization", "o1", "/institutions/o1"), node("contribution", "c1", "/contributions/c1")) as { source?: unknown };
    delete bad.source;
    d.steps[1] = bad as never;
    expect(parsePersonPathwayDocument(d)?.found).toBe(false);
  });

  it("carries the honest 'target not found' document (unresolved target, no steps)", () => {
    const doc = parsePersonPathwayDocument({
      from_id: "p1", from: node("person", "p1", "/people/p1"),
      to_id: "zzz", to: null, target_resolved: false, found: false, step_count: 0, steps: [],
    });
    expect(doc).not.toBeNull();
    expect(doc?.targetResolved).toBe(false);
    expect(doc?.found).toBe(false);
    expect(doc?.to).toBeNull();
  });

  it("rejects an unrecognized step category", () => {
    const d = validDoc();
    d.steps[0].category = "friendship";
    expect(parsePersonPathwayDocument(d)?.found).toBe(false);
  });
});
