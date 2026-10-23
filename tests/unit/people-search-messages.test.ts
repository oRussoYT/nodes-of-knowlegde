import { describe, expect, it } from "vitest";

import { checkMessage, parseContactOptions, parseMessages } from "@/features/messages/parse";
import { cleanQuery, describeLastInstitution, parseSearchResults } from "@/features/people-search/parse";

describe("people search", () => {
  it("parses results and drops unreadable rows", () => {
    const rows = parseSearchResults([
      {
        id: "p1",
        displayName: "Olga Field",
        verificationStatus: "provisional",
        lastInstitution: { organizationId: "o1", name: "INPA", status: "active", fromYear: 1985, toYear: 1992, ongoing: false },
        institutionsCount: 2,
        worksCount: 7,
        hasAccount: true,
        acceptsMessages: false,
      },
      { displayName: "No id" },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "p1", institutionsCount: 2, worksCount: 7, hasAccount: true, acceptsMessages: false });
    expect(parseSearchResults(null)).toEqual([]);
  });

  it("describes where someone was last documented", () => {
    const base = { organizationId: "o", name: "INPA", status: "active", fromYear: 1985, toYear: 1992, ongoing: false };
    expect(describeLastInstitution(base)).toBe("INPA, 1985–1992");
    expect(describeLastInstitution({ ...base, ongoing: true })).toBe("INPA, since 1985");
    expect(describeLastInstitution({ ...base, toYear: 1985 })).toBe("INPA, 1985");
    expect(describeLastInstitution({ ...base, status: "closed" })).toBe("INPA (no longer active), 1985–1992");
    expect(describeLastInstitution({ ...base, fromYear: null, toYear: null })).toBe("INPA");
  });

  it("cleans the query", () => {
    expect(cleanQuery("  peng ")).toBe("peng");
    expect(cleanQuery(undefined)).toBe("");
    expect(cleanQuery("x".repeat(150))).toHaveLength(100);
  });
});

describe("messages", () => {
  it("parses messages without ever needing an email", () => {
    const [m] = parseMessages([
      { id: "m1", direction: "received", otherLabel: "Ben A.", otherPersonId: "p2", body: "Hi", createdAt: "2026-10-23T00:00:00Z", read: false },
    ]);
    expect(m).toEqual({ id: "m1", direction: "received", otherLabel: "Ben A.", otherPersonId: "p2", body: "Hi", createdAt: "2026-10-23T00:00:00Z", read: false, replyToId: null });
    expect(parseMessages([{ id: "x" }])).toEqual([]);
  });

  it("only keeps real ORCID and OpenAlex links", () => {
    expect(parseContactOptions({ canMessage: true, orcidUrl: "https://orcid.org/0000-0002-1825-0097", openalexUrl: "https://openalex.org/A123" })).toEqual({
      hasAccount: false,
      isSelf: false,
      canMessage: true,
      orcidUrl: "https://orcid.org/0000-0002-1825-0097",
      openalexUrl: "https://openalex.org/A123",
    });
    expect(parseContactOptions({ orcidUrl: "javascript:alert(1)", openalexUrl: "https://evil.example/A1" })).toMatchObject({ orcidUrl: null, openalexUrl: null });
  });

  it("checks a message before sending", () => {
    expect(checkMessage("  hello ")).toEqual({ ok: true, body: "hello" });
    expect(checkMessage("   ").ok).toBe(false);
    expect(checkMessage("x".repeat(2001)).ok).toBe(false);
  });
});
