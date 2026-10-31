// Signed interpretations: a named person's reading of the record. Never a
// fact -- the page shows them apart from the facts, with the author's name.
// Pure parsing, unit-tested.

export type InterpretationStatus = "proposed" | "published" | "declined" | "withdrawn" | "hidden_by_subject";

export interface Interpretation {
  id: string;
  author: string;
  body: string;
  sources: string | null;
  status: InterpretationStatus;
  createdAt: string;
  isMine: boolean;
  canHide: boolean;
  canDecide: boolean;
}

export interface PendingInterpretation {
  id: string;
  subjectType: "person" | "contribution";
  subjectId: string;
  subjectLabel: string;
  author: string;
  body: string;
  sources: string | null;
  createdAt: string;
}

const STATUSES: InterpretationStatus[] = ["proposed", "published", "declined", "withdrawn", "hidden_by_subject"];

function rec(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

export function parseInterpretations(data: unknown): Interpretation[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((raw) => {
    const o = rec(raw);
    if (!o || typeof o.id !== "string" || typeof o.body !== "string") return [];
    const status = STATUSES.find((s) => s === o.status) ?? "proposed";
    return [
      {
        id: o.id,
        author: str(o.author) ?? "A member",
        body: o.body,
        sources: str(o.sources),
        status,
        createdAt: typeof o.createdAt === "string" ? o.createdAt : "",
        isMine: o.isMine === true,
        canHide: o.canHide === true,
        canDecide: o.canDecide === true,
      },
    ];
  });
}

export function parsePendingInterpretations(data: unknown): PendingInterpretation[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((raw) => {
    const o = rec(raw);
    if (!o || typeof o.id !== "string" || typeof o.subjectId !== "string" || typeof o.body !== "string") return [];
    return [
      {
        id: o.id,
        subjectType: o.subjectType === "contribution" ? "contribution" : "person",
        subjectId: o.subjectId,
        subjectLabel: str(o.subjectLabel) ?? "Untitled",
        author: str(o.author) ?? "A member",
        body: o.body,
        sources: str(o.sources),
        createdAt: typeof o.createdAt === "string" ? o.createdAt : "",
      },
    ];
  });
}

/** What a reader sees beside each interpretation's status. */
export function interpretationStatusLabel(status: InterpretationStatus): string {
  switch (status) {
    case "proposed":
      return "Waiting for a steward";
    case "published":
      return "Published";
    case "declined":
      return "Not published";
    case "withdrawn":
      return "Withdrawn";
    case "hidden_by_subject":
      return "Hidden by the person it is about";
  }
}

/** Only published ones are shown to everyone; the author also sees their own. */
export function visibleInterpretations(items: Interpretation[]): Interpretation[] {
  return items.filter((i) => i.status === "published" || i.isMine || i.canDecide);
}

/** Map the database's refusal to a plain sentence. */
export function interpretationError(message: string): string {
  if (message.includes("add your name")) return "An interpretation is signed. Add your name to your profile first.";
  if (message.includes("couple of sentences")) return "Write at least a couple of sentences.";
  if (message.includes("too many")) return "That is enough for today — try again tomorrow.";
  return "The interpretation could not be saved.";
}
