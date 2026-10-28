import { afterEach, describe, expect, it } from "vitest";

import { parseConnections, parseTopicSuggestions, reasonSentence, splitTopics, topicPrompt } from "../../src/features/connections/parse";
import { claudeIsOn, firstJsonObject } from "../../src/lib/ai/claude";

describe("connections", () => {
  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("reads connections with their reasons", () => {
    const d = parseConnections({
      personId: "me",
      topics: [{ id: "t", kind: "theme", label: "Edge effects", source: "ai", status: "proposed" }, { id: "x", kind: "colour" }],
      connections: [{ personId: "p", displayName: "Cy", inside: true, shared: [{ kind: "theme", label: "Edge effects" }, { kind: "?" }] }],
    });
    expect(d.linked).toBe(true);
    expect(d.topics).toHaveLength(1);
    expect(d.connections[0]!.shared).toHaveLength(1);
    expect(parseConnections(null).linked).toBe(false);
  });

  it("says why in plain words", () => {
    expect(reasonSentence([{ kind: "theme", label: "edge effects" }])).toBe("Both work on edge effects.");
    expect(reasonSentence([{ kind: "theme", label: "a" }, { kind: "method", label: "b" }, { kind: "organism", label: "c" }])).toBe("Both work on a, b and c.");
  });

  it("splits typed topics, without repeats", () => {
    expect(splitTopics("Edge effects, edge  effects;\nMist netting\nx", "method")).toEqual([
      { kind: "method", label: "Edge effects" },
      { kind: "method", label: "Mist netting" },
    ]);
  });

  it("asks the AI only about the record, and keeps valid suggestions", () => {
    expect(topicPrompt({ name: "Ana", works: ["Edge effects on birds"] })).toContain("Edge effects on birds");
    expect(parseTopicSuggestions(firstJsonObject('ok {"topics":[{"kind":"theme","label":"Edge effects","reason":"work 1"},{"kind":"mood","label":"x"}]}'))).toEqual([
      { kind: "theme", label: "Edge effects", reason: "work 1" },
    ]);
    expect(firstJsonObject("nothing")).toBeNull();
  });

  it("AI is off without a key", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(claudeIsOn()).toBe(false);
  });
});
