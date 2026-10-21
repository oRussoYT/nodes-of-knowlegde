// Proposed contributions (candidate -> review -> record). Pure parsing and
// form validation, unit-tested. A candidate is never the record: the screens
// always label it "waiting for review" until a steward accepts it.

export interface Option {
  key: string;
  label: string;
}

export interface ContributionOptions {
  kinds: Option[];
  capacities: Option[];
}

export type CandidateStatus = "pending" | "accepted" | "rejected";

export interface MyCandidate {
  id: string;
  personId: string;
  title: string;
  status: CandidateStatus;
  decisionNote: string | null;
  contributionId: string | null;
}

export interface QueueCandidate {
  id: string;
  personId: string;
  displayName: string;
  title: string;
  kindLabel: string;
  capacityLabel: string;
  description: string | null;
  startYear: number | null;
  endYear: number | null;
  sourceNote: string;
  toldByThePerson: boolean;
  isOwnProposal: boolean;
}

function rec(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}
function int(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) ? v : null;
}
function options(v: unknown): Option[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((o) => {
    const r = rec(o);
    const key = str(r?.key);
    const label = str(r?.label);
    return key && label ? [{ key, label }] : [];
  });
}

export function parseContributionOptions(data: unknown): ContributionOptions {
  const r = rec(data);
  return { kinds: options(r?.kinds), capacities: options(r?.capacities) };
}

const STATUSES: readonly CandidateStatus[] = ["pending", "accepted", "rejected"];

export function parseMyCandidates(data: unknown): MyCandidate[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row) => {
    const r = rec(row);
    const id = str(r?.id);
    const personId = str(r?.person_id);
    const title = str(r?.title);
    const status = r?.status;
    if (!id || !personId || !title || !STATUSES.includes(status as CandidateStatus)) return [];
    return [{ id, personId, title, status: status as CandidateStatus, decisionNote: str(r?.decision_note), contributionId: str(r?.contribution_id) }];
  });
}

export function parseQueue(data: unknown): QueueCandidate[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row) => {
    const r = rec(row);
    const id = str(r?.id);
    const personId = str(r?.person_id);
    const displayName = str(r?.display_name);
    const title = str(r?.title);
    const sourceNote = str(r?.source_note);
    if (!id || !personId || !displayName || !title || !sourceNote) return [];
    return [{
      id, personId, displayName, title, sourceNote,
      kindLabel: str(r?.kind_label) ?? "Contribution",
      capacityLabel: str(r?.capacity_label) ?? "",
      description: str(r?.description),
      startYear: int(r?.start_year),
      endYear: int(r?.end_year),
      toldByThePerson: r?.source_type === "self_reported",
      isOwnProposal: r?.is_own_proposal === true,
    }];
  });
}

export const STATUS_LABEL: Record<CandidateStatus, string> = {
  pending: "Waiting for review",
  accepted: "Added to the record",
  rejected: "Not added",
};

export type ProposalForm =
  | { ok: true; value: { title: string; kind: string; capacity: string; sourceNote: string; description: string | null; startYear: number | null; endYear: number | null } }
  | { ok: false; error: string };

function year(raw: string): number | null | "bad" {
  const t = raw.trim();
  if (!t) return null;
  if (!/^\d{4}$/.test(t)) return "bad";
  const n = Number(t);
  return n >= 1500 && n <= 2100 ? n : "bad";
}

/** Validates the proposal form before the database checks it again. */
export function readProposalForm(f: { title: string; kind: string; capacity: string; sourceNote: string; description: string; startYear: string; endYear: string }): ProposalForm {
  const title = f.title.trim().replace(/\s+/g, " ");
  const sourceNote = f.sourceNote.trim();
  if (!title) return { ok: false, error: "Give it a title." };
  if (!f.kind) return { ok: false, error: "Choose what kind of contribution it is." };
  if (!f.capacity) return { ok: false, error: "Choose how you contributed." };
  if (!sourceNote) return { ok: false, error: "Say what documents it — a thesis, a report, a field book." };
  const startYear = year(f.startYear);
  const endYear = year(f.endYear);
  if (startYear === "bad" || endYear === "bad") return { ok: false, error: "Years are four digits, between 1500 and 2100." };
  if (endYear !== null && (startYear === null || endYear < startYear)) return { ok: false, error: "The end year needs a start year before it." };
  const description = f.description.trim();
  return { ok: true, value: { title, kind: f.kind, capacity: f.capacity, sourceNote, description: description || null, startYear, endYear } };
}
