import { describe, expect, it } from "vitest";

import { getIdentityStatusCopy } from "../../src/features/identity/copy";
import type { IdentityStatus } from "../../src/features/identity/types";

describe("getIdentityStatusCopy", () => {
  it("no_claim preserves the exact 'not yet connected' wording other tests key off of", () => {
    const copy = getIdentityStatusCopy({ kind: "no_claim" });
    expect(copy.title).toMatch(/connected to a Nodes of Knowledge person record/);
  });

  it("interpolates the person's name when known, for pending/approved/rejected/withdrawn", () => {
    const base = {
      claim: { id: "c1", personId: "p1", status: "submitted" as const, submittedAt: "2026-01-01", decidedAt: null },
      personDisplayName: "Ada Lovelace",
    };
    const statuses: IdentityStatus[] = [
      { kind: "pending", ...base },
      { kind: "approved", ...base },
      { kind: "rejected", ...base },
      { kind: "withdrawn", ...base },
    ];

    for (const status of statuses) {
      expect(getIdentityStatusCopy(status).title).toContain("Ada Lovelace");
    }
  });

  it("falls back to generic copy when the person's name is not (yet) known", () => {
    const copy = getIdentityStatusCopy({
      kind: "pending",
      claim: { id: "c1", personId: "p1", status: "submitted", submittedAt: "2026-01-01", decidedAt: null },
      personDisplayName: null,
    });
    expect(copy.title).not.toContain("null");
    expect(copy.title.length).toBeGreaterThan(0);
  });

  it("uses truthful present-tense capability language — never describes a shipped capability (claiming, participation, the network) as a future milestone", () => {
    // Production Experience Phase I: claiming (M5.3), participation (M6.3), and
    // the network (M7) all shipped. No claimant-facing status copy may describe
    // them as deferred; the no_claim state in particular invites a real,
    // available claim workflow rather than promising it "in a later milestone".
    const kinds: IdentityStatus["kind"][] = ["no_claim", "pending", "approved", "rejected", "withdrawn"];
    const claim = { id: "c1", personId: "p1", status: "approved" as const, submittedAt: "2026-01-01", decidedAt: "2026-01-02" };
    const obsolete = [/later milestone/i, /will be available/i, /coming soon/i, /not yet available/i];

    for (const kind of kinds) {
      const status = kind === "no_claim" ? { kind } : ({ kind, claim, personDisplayName: "Ada Lovelace" } as IdentityStatus);
      const copy = getIdentityStatusCopy(status);
      const text = `${copy.title} ${copy.description}`;
      for (const pattern of obsolete) {
        expect(text, `${kind}: "${text}"`).not.toMatch(pattern);
      }
    }
  });

  it("never mentions reviewer notes, decisions, or any administrative detail the claimant is not authorized to see", () => {
    const allKinds: IdentityStatus[] = [
      { kind: "no_claim" },
      {
        kind: "pending",
        claim: { id: "c1", personId: "p1", status: "submitted", submittedAt: "2026-01-01", decidedAt: null },
        personDisplayName: "Ada Lovelace",
      },
      {
        kind: "rejected",
        claim: { id: "c1", personId: "p1", status: "rejected", submittedAt: "2026-01-01", decidedAt: "2026-01-02" },
        personDisplayName: "Ada Lovelace",
      },
    ];

    for (const status of allKinds) {
      const copy = getIdentityStatusCopy(status);
      const text = `${copy.title} ${copy.description}`.toLowerCase();
      expect(text).not.toMatch(/reviewer|decision note|admin/);
    }
  });

  it("never fabricates a record or metric (a count attached to participation/publication/etc.) in any status branch", () => {
    // Not a ban on the domain words themselves — copy may legitimately name
    // "participation" or "the network" when it is true and present-tense (see
    // copy.ts, Production Experience Phase I). What must never appear is a
    // fabricated *count*, e.g. "3 publications" or "12 collaborators" — see the
    // identical reasoning in
    // tests/e2e/workspace-pages-quality.spec.ts's honest-empty-state test.
    const allKinds: IdentityStatus["kind"][] = ["no_claim", "pending", "approved", "rejected", "withdrawn"];
    const claim = { id: "c1", personId: "p1", status: "approved" as const, submittedAt: "2026-01-01", decidedAt: "2026-01-02" };
    const fabricatedMetricPattern =
      /\b\d[\d,]*\+?\s*(participations?|publications?|institutions?|projects?|relationships?|collaborators?|connections?|records?)\b/i;

    for (const kind of allKinds) {
      const status = kind === "no_claim" ? { kind } : ({ kind, claim, personDisplayName: "Ada Lovelace" } as IdentityStatus);
      const copy = getIdentityStatusCopy(status);
      const text = `${copy.title} ${copy.description}`;
      expect(text).not.toMatch(fabricatedMetricPattern);
    }
  });
});
