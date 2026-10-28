// The private research space: notes, hypotheses, interviews and readings
// that only their author sees. Pure -- unit-tested.

export type NoteKind = "note" | "hypothesis" | "interview" | "reading";

export const NOTE_KINDS: { key: NoteKind; label: string }[] = [
  { key: "note", label: "Note" },
  { key: "hypothesis", label: "Hypothesis" },
  { key: "interview", label: "Interview" },
  { key: "reading", label: "Reading (a PDF, an article)" },
];

export interface ResearchNote {
  id: string;
  kind: NoteKind;
  title: string;
  body: string | null;
  filePath: string | null;
  people: { id: string; displayName: string }[];
  organizations: { id: string; name: string }[];
  submittedItemId: string | null;
  submittedStatus: "proposed" | "accepted" | "rejected" | null;
  updatedAt: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseNote(raw: unknown): ResearchNote | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.title !== "string") return null;
  const kind = NOTE_KINDS.some((k) => k.key === raw.kind) ? (raw.kind as NoteKind) : "note";
  const status = raw.submittedStatus === "proposed" || raw.submittedStatus === "accepted" || raw.submittedStatus === "rejected" ? raw.submittedStatus : null;
  return {
    id: raw.id,
    kind,
    title: raw.title,
    body: typeof raw.body === "string" ? raw.body : null,
    filePath: typeof raw.filePath === "string" ? raw.filePath : null,
    people: Array.isArray(raw.people) ? raw.people.filter(isRecord).flatMap((p) => (typeof p.id === "string" ? [{ id: p.id, displayName: String(p.displayName ?? "") }] : [])) : [],
    organizations: Array.isArray(raw.organizations) ? raw.organizations.filter(isRecord).flatMap((o) => (typeof o.id === "string" ? [{ id: o.id, name: String(o.name ?? "") }] : [])) : [],
    submittedItemId: typeof raw.submittedItemId === "string" ? raw.submittedItemId : null,
    submittedStatus: status,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
  };
}

export function parseNotes(data: unknown): ResearchNote[] {
  return Array.isArray(data) ? data.map(parseNote).filter((n): n is ResearchNote => n !== null) : [];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type NoteFormResult = { ok: true; payload: Record<string, unknown> } | { ok: false; error: string };

export function parseNoteForm(form: FormData): NoteFormResult {
  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : "";
  };
  const title = get("title").trim();
  if (title.length < 1 || title.length > 300) return { ok: false, error: "Give it a title." };
  const body = get("body");
  if (body.length > 100_000) return { ok: false, error: "The text is too long (100,000 characters at most)." };
  const kind = NOTE_KINDS.some((k) => k.key === get("kind")) ? get("kind") : "note";
  const id = get("id");
  return {
    ok: true,
    payload: {
      id: UUID.test(id) ? id : null,
      kind,
      title,
      body: body.trim() === "" ? null : body,
      filePath: get("filePath").trim() || null,
      personIds: [...new Set(form.getAll("personId").map(String).filter((p) => UUID.test(p)))],
      organizationIds: [...new Set(form.getAll("organizationId").map(String).filter((p) => UUID.test(p)))],
    },
  };
}

/** What a note becomes when sent for review. */
export function proposalFromNote(n: ResearchNote, heritagePath: string | null): Record<string, unknown> {
  return {
    kind: n.kind === "interview" ? "oral_history" : "document",
    title: n.title.slice(0, 300),
    summary: n.body ? n.body.slice(0, 5000) : null,
    filePath: heritagePath,
    sourceNote: n.kind === "interview" ? "Interview recorded and sent by the proposer" : "Research notes sent by the proposer",
    links: n.people.map((p) => ({ personId: p.id, role: n.kind === "interview" ? "interviewed" : "mentioned" })),
    organizationId: n.organizations[0]?.id ?? null,
  };
}

export function excerpt(body: string | null, max = 180): string {
  if (!body) return "";
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
