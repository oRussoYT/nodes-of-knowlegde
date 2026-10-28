// Proposals that would change the record (record_candidates): parsing and
// form validation. Pure -- unit-tested. Nothing here is a fact; a steward
// decides.

export type CandidateKind = "participation" | "relationship";
export type CandidateStatus = "pending" | "accepted" | "rejected";
export type CandidateOrigin = "form" | "orcid" | "lattes" | "ai";

export interface Option {
  key: string;
  label: string;
}

export interface RecordOptions {
  capacities: Option[];
  relationshipKinds: Option[];
}

export interface RecordCandidate {
  id: string;
  kind: CandidateKind;
  origin: CandidateOrigin;
  status: CandidateStatus;
  aboutPersonId: string;
  aboutPersonName: string;
  organizationId: string | null;
  organizationName: string | null;
  isNewOrganization: boolean;
  capacityLabel: string | null;
  relationshipLabel: string | null;
  colleaguePersonId: string | null;
  colleagueName: string | null;
  isNewColleague: boolean;
  startYear: number | null;
  endYear: number | null;
  isOngoing: boolean;
  summary: string | null;
  sourceNote: string;
  sourceType: "self_reported" | "nominated_by_other";
  evidencePaths: string[];
  decisionNote: string | null;
  resultId: string | null;
  isOwnProposal: boolean;
  createdAt: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}
function year(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) ? v : null;
}

export function parseOptions(data: unknown): RecordOptions {
  const r = isRecord(data) ? data : {};
  const list = (v: unknown): Option[] =>
    Array.isArray(v)
      ? v.filter(isRecord).flatMap((o) => (str(o.key) && str(o.label) ? [{ key: o.key as string, label: o.label as string }] : []))
      : [];
  return { capacities: list(r.capacities), relationshipKinds: list(r.relationshipKinds) };
}

export function parseCandidates(data: unknown): RecordCandidate[] {
  if (!Array.isArray(data)) return [];
  const out: RecordCandidate[] = [];
  for (const raw of data) {
    if (!isRecord(raw)) continue;
    const id = str(raw.id);
    const kind = raw.kind === "relationship" ? "relationship" : raw.kind === "participation" ? "participation" : null;
    const about = str(raw.aboutPersonId);
    const sourceNote = str(raw.sourceNote);
    const createdAt = str(raw.createdAt);
    if (!id || !kind || !about || !sourceNote || !createdAt) continue;
    out.push({
      id,
      kind,
      origin: raw.origin === "orcid" || raw.origin === "lattes" || raw.origin === "ai" ? raw.origin : "form",
      status: raw.status === "accepted" || raw.status === "rejected" ? raw.status : "pending",
      aboutPersonId: about,
      aboutPersonName: str(raw.aboutPersonName) ?? "",
      organizationId: str(raw.organizationId),
      organizationName: str(raw.organizationName),
      isNewOrganization: raw.isNewOrganization === true,
      capacityLabel: str(raw.capacityLabel),
      relationshipLabel: str(raw.relationshipLabel),
      colleaguePersonId: str(raw.colleaguePersonId),
      colleagueName: str(raw.colleagueName),
      isNewColleague: raw.isNewColleague === true,
      startYear: year(raw.startYear),
      endYear: year(raw.endYear),
      isOngoing: raw.isOngoing === true,
      summary: str(raw.summary),
      sourceNote,
      sourceType: raw.sourceType === "nominated_by_other" ? "nominated_by_other" : "self_reported",
      evidencePaths: Array.isArray(raw.evidencePaths) ? raw.evidencePaths.filter((p): p is string => typeof p === "string") : [],
      decisionNote: str(raw.decisionNote),
      resultId: str(raw.resultId),
      isOwnProposal: raw.isOwnProposal === true,
      createdAt,
    });
  }
  return out;
}

/** "1991–1994", "since 1991", "1991", "date unknown". */
export function describeYears(c: { startYear: number | null; endYear: number | null; isOngoing: boolean }): string {
  if (c.startYear === null) return "date unknown";
  if (c.isOngoing) return `since ${c.startYear}`;
  if (c.endYear !== null && c.endYear !== c.startYear) return `${c.startYear}–${c.endYear}`;
  return String(c.startYear);
}

/** One line saying what the proposal would add. */
export function describeCandidate(c: RecordCandidate): string {
  const when = describeYears(c);
  if (c.kind === "participation") {
    return `${c.aboutPersonName}: ${c.capacityLabel ?? "a role"} at ${c.organizationName ?? "an institution"}${c.isNewOrganization ? " (new institution)" : ""}, ${when}`;
  }
  return `${c.aboutPersonName} and ${c.colleagueName ?? "a colleague"}${c.isNewColleague ? " (new to the record)" : ""}: ${c.relationshipLabel ?? "a documented bond"}, ${when}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORCID = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

function field(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

function parseYear(raw: string): number | null | "bad" {
  if (raw === "") return null;
  if (!/^\d{4}$/.test(raw)) return "bad";
  const n = Number(raw);
  return n >= 1500 && n <= 2100 ? n : "bad";
}

export type ProposalResult = { ok: true; payload: Record<string, unknown> } | { ok: false; error: string };

function common(form: FormData): ProposalResult {
  const about = field(form, "aboutPersonId");
  if (!UUID.test(about)) return { ok: false, error: "Choose whose record this is about." };
  const start = parseYear(field(form, "startYear"));
  const end = parseYear(field(form, "endYear"));
  const ongoing = form.get("isOngoing") === "on";
  if (start === "bad" || end === "bad") return { ok: false, error: "Years must have four digits, between 1500 and 2100." };
  if (end !== null && (start === null || end < start)) return { ok: false, error: "The end year needs a start year before it." };
  if (ongoing && (start === null || end !== null)) return { ok: false, error: "“Still there” needs a start year and no end year." };
  const sourceNote = field(form, "sourceNote");
  if (sourceNote === "") return { ok: false, error: "Say what documents this — a roster, a thesis, a field book, a photo, your own memory." };
  if (sourceNote.length > 1000) return { ok: false, error: "The note about the source is too long (1,000 characters at most)." };
  const summary = field(form, "summary");
  if (summary.length > 2000) return { ok: false, error: "The description is too long (2,000 characters at most)." };
  const evidence = form.getAll("evidencePath").map(String).filter(Boolean);
  if (evidence.length > 10) return { ok: false, error: "Attach at most 10 files." };
  return {
    ok: true,
    payload: {
      aboutPersonId: about,
      startYear: start,
      endYear: end,
      isOngoing: ongoing,
      sourceNote,
      summary: summary || null,
      evidencePaths: evidence,
    },
  };
}

/** "A period of my history" form. */
export function parseParticipationForm(form: FormData): ProposalResult {
  const base = common(form);
  if (!base.ok) return base;
  const organizationId = field(form, "organizationId");
  const newOrganizationName = field(form, "newOrganizationName");
  if (!UUID.test(organizationId) && newOrganizationName === "") return { ok: false, error: "Choose or name the institution." };
  if (newOrganizationName.length > 300) return { ok: false, error: "The institution name is too long." };
  const capacity = field(form, "capacity");
  if (capacity === "") return { ok: false, error: "Choose the role." };
  return {
    ok: true,
    payload: {
      ...base.payload,
      kind: "participation",
      organizationId: UUID.test(organizationId) ? organizationId : null,
      newOrganizationName: UUID.test(organizationId) ? null : newOrganizationName,
      capacity,
    },
  };
}

/** "Someone I worked with" form. */
export function parseColleagueForm(form: FormData): ProposalResult {
  const base = common(form);
  if (!base.ok) return base;
  const kind = field(form, "relationshipKind");
  if (kind === "") return { ok: false, error: "Choose what kind of bond it was." };
  const colleagueId = field(form, "colleaguePersonId");
  const given = field(form, "colleagueGivenName");
  const family = field(form, "colleagueFamilyName");
  const orcidRaw = field(form, "colleagueOrcid").replace(/^https?:\/\/(www\.)?orcid\.org\//i, "").toUpperCase();
  if (!UUID.test(colleagueId) && (given === "" || family === "")) {
    return { ok: false, error: "Choose the person, or write their first and last name." };
  }
  if (UUID.test(colleagueId) && colleagueId === base.payload.aboutPersonId) return { ok: false, error: "A bond needs two different people." };
  if (orcidRaw !== "" && !ORCID.test(orcidRaw)) return { ok: false, error: "The ORCID iD should look like 0000-0002-1825-0097." };
  return {
    ok: true,
    payload: {
      ...base.payload,
      kind: "relationship",
      relationshipKind: kind,
      colleaguePersonId: UUID.test(colleagueId) ? colleagueId : null,
      colleagueGivenName: UUID.test(colleagueId) ? null : given,
      colleagueFamilyName: UUID.test(colleagueId) ? null : family,
      colleagueOrcid: orcidRaw || null,
    },
  };
}

export const ORIGIN_LABELS: Record<CandidateOrigin, string> = {
  form: "Proposed by a member",
  orcid: "Imported from ORCID",
  lattes: "Imported from Currículo Lattes",
  ai: "Extracted by AI from a document",
};

export const EVIDENCE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain", "text/xml", "application/xml"] as const;
export const EVIDENCE_MAX_BYTES = 15 * 1024 * 1024;

export function evidenceProblem(file: { type: string; size: number }): string | null {
  if (!(EVIDENCE_TYPES as readonly string[]).includes(file.type)) return "Use a PDF, an image (JPG, PNG, WebP) or a text/XML file.";
  if (file.size > EVIDENCE_MAX_BYTES) return "The file is larger than 15 MB.";
  return null;
}
