import { describe, expect, it } from "vitest";

import { buildPersonPathwayView } from "../../src/features/revelation/derive";
import type { PersonPathwayDocument, PathwayStep } from "../../src/features/revelation/types";

function pnode(type: PathwayStep["from"]["type"], id: string): PathwayStep["from"] {
  return { type, id, label: `${type} ${id}`, secondaryLabel: null, href: `/${type}/${id}`, verificationStatus: "provisional" };
}
function step(from: PathwayStep["from"], to: PathwayStep["to"]): PathwayStep {
  return {
    source: { type: "participations", id: "s1" },
    category: "participation",
    label: "Researcher",
    from,
    to,
    temporal: {
      startDate: "1980-01-01", startPrecision: "year", endDate: null, endPrecision: null,
      isApproximate: false, isOngoing: false, dateIsUnknown: false, dateIsUncertain: false,
    },
    provenance: { sourceType: "imported_historical", verificationStatus: "provisional" },
  };
}
function doc(over: Partial<PersonPathwayDocument>): PersonPathwayDocument {
  return {
    fromId: "p1", from: pnode("person", "p1"),
    toId: "c1", to: pnode("contribution", "c1"),
    targetResolved: true, found: false, stepCount: 0, steps: [],
    ...over,
  };
}

describe("buildPersonPathwayView", () => {
  it("reads a null document as the no-target state (nothing chosen)", () => {
    expect(buildPersonPathwayView(null).state).toBe("no-target");
  });

  it("reads an unresolved target as target-not-found", () => {
    expect(buildPersonPathwayView(doc({ targetResolved: false })).state).toBe("target-not-found");
  });

  it("reads a resolved target with no chain as no-chain (honest absence, never 'not connected')", () => {
    expect(buildPersonPathwayView(doc({ targetResolved: true, found: false })).state).toBe("no-chain");
  });

  it("reads a found chain as the chain state, preserving the steps unmodified", () => {
    const steps = [step(pnode("person", "p1"), pnode("organization", "o1")), step(pnode("organization", "o1"), pnode("contribution", "c1"))];
    const view = buildPersonPathwayView(doc({ found: true, stepCount: 2, steps }));
    expect(view.state).toBe("chain");
    expect(view.document?.steps.length).toBe(2);
  });
});
