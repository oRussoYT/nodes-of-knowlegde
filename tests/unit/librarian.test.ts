import { describe, expect, it } from "vitest";

import { citedNumbers, librarianPrompt, parseSources, pieces, wordsOf } from "../../src/features/librarian/parse";

describe("the librarian", () => {
  it("keeps the words worth searching", () => {
    expect(wordsOf("Quem trabalhou no Acampamento 41 com a Zélia Quillmark?")).toEqual(["trabalhou", "Acampamento", "Zélia", "Quillmark"]);
    expect(wordsOf("Who worked at INPA and INPA?")).toEqual(["worked", "INPA"]);
  });

  it("numbers sources and drops anything not from the record", () => {
    const s = parseSources([
      { type: "person", id: "1", title: "Ana", url: "/people/1", text: "Ana. Field assistant." },
      { type: "person", id: "2", title: "Evil", url: "https://evil.example", text: "x" },
      { type: "spaceship", id: "3", title: "x", url: "/x", text: "x" },
    ]);
    expect(s).toEqual([{ n: 1, type: "person", id: "1", title: "Ana", url: "/people/1", text: "Ana. Field assistant." }]);
  });

  it("asks the AI to use only the sources, with citations", () => {
    const p = librarianPrompt("Who?", "archive", [{ n: 1, type: "person", id: "1", title: "Ana", url: "/people/1", text: "Ana. Field assistant." }]);
    expect(p).toContain("ONLY the numbered sources");
    expect(p).toContain("[1] (person) Ana. Field assistant.");
    expect(p).toContain("what is missing");
  });

  it("links citations and drops ones to sources that do not exist", () => {
    const p = pieces("Ana worked there [1, 3].\n\nShe left in 1991 [2][9].", 2);
    expect(p[0]).toEqual([{ text: "Ana worked there " }, { cite: 1 }, { text: "." }]);
    expect(citedNumbers(p)).toEqual([1, 2]);
  });
});
