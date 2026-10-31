// The AI librarian: questions answered only from the record, with numbered
// sources. Pure -- unit-tested.

export interface Source {
  n: number;
  type: "person" | "institution" | "work" | "history";
  id: string;
  title: string;
  url: string;
  text: string;
}

const STOP = new Set(
  (
    "the and for with from that this what who when where which were was are how many much about into onto than then there their they them have has had did does can could would should our your you all any some more most also not but only over under after before between during " +
    "que quem quando onde qual quais como para por com sem uma umas uns dos das nos nas pelo pela pelos pelas sobre entre ate até depois antes mais menos muito muita muitos muitas foi foram era eram ser estar esta este isso isto essa esse aquele aquela tem têm tinha seus suas seu sua"
  ).split(" "),
);

/** The words worth searching for in a question (no stop words, max 12). */
export function wordsOf(question: string): string[] {
  const seen = new Set<string>();
  return question
    .normalize("NFC")
    .split(/[^\p{L}\p{N}-]+/u)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOP.has(w.toLowerCase()))
    .filter((w) => {
      const k = w.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 12);
}

const TYPES = new Set(["person", "institution", "work", "history"]);

export function parseSources(data: unknown): Source[] {
  if (!Array.isArray(data)) return [];
  let n = 0;
  return data.flatMap((r) => {
    if (typeof r !== "object" || r === null) return [];
    const o = r as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.title !== "string" || typeof o.url !== "string" || typeof o.text !== "string" || !TYPES.has(String(o.type))) return [];
    if (!o.url.startsWith("/")) return [];
    n += 1;
    return [{ n, type: o.type as Source["type"], id: o.id, title: o.title, url: o.url, text: o.text }];
  });
}

export type Mode = "answer" | "summary" | "compare" | "teach" | "archive" | "research" | "patterns";

export const MODES: { key: Mode; label: string; hint: string; instruction: string }[] = [
  { key: "answer", label: "Answer a question", hint: "Who worked at Camp 41 in the 1980s?", instruction: "Answer the question." },
  { key: "summary", label: "Summarize", hint: "Summarize the history of the Dimona camp", instruction: "Write a short summary (one or two paragraphs)." },
  { key: "compare", label: "Compare", hint: "Compare INPA and the Smithsonian in this history", instruction: "Compare the things asked about, side by side, only on points the sources cover." },
  { key: "teach", label: "For a class", hint: "Explain the forest fragments project for undergraduates", instruction: "Explain it for students, simply, with 3 questions for discussion at the end." },
  { key: "research", label: "Help my research", hint: "I study bats in fragments: what should I read, and whom could I interview?", instruction: "From the sources only, suggest research questions, works to read (cite them) and people to interview (cite them). Say clearly these are suggestions." },
  { key: "patterns", label: "Explain a pattern", hint: "Why did so many people move from Camp 41 to INPA?", instruction: "Describe the pattern the sources show (who, where, when) and what the sources say about why; never invent causes. Keep facts and hypotheses apart, and label hypotheses as such." },
  { key: "archive", label: "For archivists", hint: "What is missing about the 1990s field assistants?", instruction: "Say what the sources show and, separately, what is missing or undated and which documents could fill it. Never guess facts." },
];

export function librarianPrompt(question: string, mode: Mode, sources: Source[]): string {
  const m = MODES.find((x) => x.key === mode) ?? MODES[0]!;
  return [
    "You are the librarian of a scientific-history archive. Use ONLY the numbered sources below — nothing from outside.",
    "Cite every statement with its source number in square brackets, like [2]. If the sources do not answer, say so plainly and say what is missing.",
    "Never rank, score or praise people. Write in the language of the question. Plain text, short paragraphs, no headings.",
    `Task: ${m.instruction}`,
    "",
    `Question: ${question}`,
    "",
    "Sources:",
    ...sources.map((s) => `[${s.n}] (${s.type}) ${s.text}`),
  ].join("\n");
}

export type Piece = { text: string } | { cite: number };

/** Splits an answer into text and citations, dropping citations to sources that do not exist. */
export function pieces(answer: string, sourceCount: number): Piece[][] {
  return answer
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => {
      const out: Piece[] = [];
      let last = 0;
      for (const m of para.matchAll(/\[(\d{1,3}(?:\s*,\s*\d{1,3})*)\]/g)) {
        if (m.index! > last) out.push({ text: para.slice(last, m.index) });
        for (const n of m[1]!.split(",").map((x) => Number(x.trim()))) {
          if (n >= 1 && n <= sourceCount) out.push({ cite: n });
        }
        last = m.index! + m[0].length;
      }
      if (last < para.length) out.push({ text: para.slice(last) });
      return out;
    });
}

/** Citations used in an answer (distinct, in order). */
export function citedNumbers(p: Piece[][]): number[] {
  return [...new Set(p.flat().flatMap((x) => ("cite" in x ? [x.cite] : [])))];
}
