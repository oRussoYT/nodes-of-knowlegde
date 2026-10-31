// Declaring ties correctly: the signed-in person's own support list plus what
// the record already knows (appointments, advisors, advisees, recent
// co-authors and collaborators), shaped as drafts for NIH Other Support and
// the NSF Collaborators & Other Affiliations (COA). A draft to check, never a
// filed declaration. Pure, unit-tested.

export type SupportStatus = "current" | "pending" | "past";
export type SupportKind = "grant" | "contract" | "fellowship" | "in_kind" | "startup" | "other";

export interface SupportItem {
  id: string;
  kind: SupportKind;
  status: SupportStatus;
  title: string;
  funder: string | null;
  role: string | null;
  startYear: number | null;
  endYear: number | null;
  effortMonths: number | null;
  amountNote: string | null;
  overlapNote: string | null;
}

export interface Appointment {
  organization: string;
  role: string;
  startYear: number | null;
  endYear: number | null;
  ongoing: boolean;
}

export interface TiedPerson {
  personId: string;
  name: string;
  affiliation: string | null;
  startYear: number | null;
  endYear: number | null;
  lastYear: number | null;
  works: number | null;
  kind: string | null;
}

export interface SupportDraft {
  personId: string | null;
  name: string | null;
  appointments: Appointment[];
  advisors: TiedPerson[];
  advisees: TiedPerson[];
  coauthors: TiedPerson[];
  collaborators: TiedPerson[];
  support: SupportItem[];
}

export const SUPPORT_KINDS: { key: SupportKind; label: string }[] = [
  { key: "grant", label: "Grant" },
  { key: "contract", label: "Contract" },
  { key: "fellowship", label: "Fellowship or scholarship" },
  { key: "in_kind", label: "In-kind support (lab space, equipment, staff)" },
  { key: "startup", label: "Start-up or institutional funds" },
  { key: "other", label: "Other" },
];

export const SUPPORT_STATUSES: { key: SupportStatus; label: string }[] = [
  { key: "current", label: "Current" },
  { key: "pending", label: "Pending" },
  { key: "past", label: "Ended" },
];

function rec(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);

function people(v: unknown): TiedPerson[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((raw) => {
    const o = rec(raw);
    if (!o || typeof o.personId !== "string" || typeof o.name !== "string") return [];
    return [
      {
        personId: o.personId,
        name: o.name,
        affiliation: str(o.affiliation),
        startYear: num(o.startYear),
        endYear: num(o.endYear),
        lastYear: num(o.lastYear),
        works: num(o.works),
        kind: str(o.kind),
      },
    ];
  });
}

export function parseSupportDraft(data: unknown): SupportDraft | null {
  const o = rec(data);
  if (!o) return null;
  const appointments: Appointment[] = Array.isArray(o.appointments)
    ? o.appointments.flatMap((raw) => {
        const a = rec(raw);
        if (!a || typeof a.organization !== "string") return [];
        return [{ organization: a.organization, role: str(a.role) ?? "Member", startYear: num(a.startYear), endYear: num(a.endYear), ongoing: a.ongoing === true }];
      })
    : [];
  const support: SupportItem[] = Array.isArray(o.support)
    ? o.support.flatMap((raw) => {
        const s = rec(raw);
        if (!s || typeof s.id !== "string" || typeof s.title !== "string") return [];
        const kind = SUPPORT_KINDS.find((k) => k.key === s.kind)?.key ?? "other";
        const status = SUPPORT_STATUSES.find((k) => k.key === s.status)?.key ?? "current";
        return [
          {
            id: s.id,
            kind,
            status,
            title: s.title,
            funder: str(s.funder),
            role: str(s.role),
            startYear: num(s.startYear),
            endYear: num(s.endYear),
            effortMonths: num(s.effortMonths),
            amountNote: str(s.amountNote),
            overlapNote: str(s.overlapNote),
          },
        ];
      })
    : [];
  return {
    personId: str(o.personId),
    name: str(o.name),
    appointments,
    advisors: people(o.advisors),
    advisees: people(o.advisees),
    coauthors: people(o.coauthors),
    collaborators: people(o.collaborators),
    support,
  };
}

function years(start: number | null, end: number | null, ongoing = false): string {
  if (start === null && end === null) return ongoing ? "ongoing" : "dates not recorded";
  if (ongoing || end === null) return `${start ?? "?"}–present`;
  return start === end ? `${start}` : `${start ?? "?"}–${end}`;
}

/** Plain text in the order NIH Other Support asks for. */
export function otherSupportText(d: SupportDraft): string {
  const lines: string[] = [`OTHER SUPPORT — ${d.name ?? "(name)"}`, "Draft drawn from Nodes of Knowledge. Check every line before filing.", ""];
  const section = (title: string, status: SupportStatus) => {
    const items = d.support.filter((s) => s.status === status && s.kind !== "in_kind");
    lines.push(title);
    if (items.length === 0) lines.push("  None listed.");
    items.forEach((s, n) => {
      lines.push(`  ${n + 1}. ${s.title}`);
      lines.push(`     Funder: ${s.funder ?? "—"} · Role: ${s.role ?? "—"} · ${years(s.startYear, s.endYear)}`);
      if (s.amountNote) lines.push(`     Amount: ${s.amountNote}`);
      if (s.effortMonths !== null) lines.push(`     Person months per year: ${s.effortMonths}`);
      if (s.overlapNote) lines.push(`     Overlap: ${s.overlapNote}`);
    });
    lines.push("");
  };
  section("ACTIVE", "current");
  section("PENDING", "pending");
  const inKind = d.support.filter((s) => s.kind === "in_kind" && s.status !== "past");
  lines.push("IN-KIND CONTRIBUTIONS");
  if (inKind.length === 0) lines.push("  None listed.");
  inKind.forEach((s, n) => lines.push(`  ${n + 1}. ${s.title}${s.funder ? ` — from ${s.funder}` : ""}${s.amountNote ? ` (${s.amountNote})` : ""}`));
  lines.push("", "APPOINTMENTS IN THE RECORD");
  const current = d.appointments.filter((a) => a.ongoing || a.endYear === null);
  if (current.length === 0) lines.push("  None recorded as current.");
  current.forEach((a) => lines.push(`  ${a.role}, ${a.organization} (${years(a.startYear, a.endYear, a.ongoing)})`));
  return lines.join("\n");
}

export interface CoaRow {
  table: "Advisors" | "Advisees" | "Co-authors" | "Collaborators";
  name: string;
  affiliation: string;
  lastActive: string;
}

/** Rows for the NSF COA template (table 3 and 4), alphabetical within each table. */
export function coaRows(d: SupportDraft): CoaRow[] {
  const row = (table: CoaRow["table"], p: TiedPerson, last: number | null): CoaRow => ({
    table,
    name: p.name,
    affiliation: p.affiliation ?? "",
    lastActive: last === null ? "" : String(last),
  });
  return [
    ...d.advisors.map((p) => row("Advisors", p, p.endYear ?? p.startYear)),
    ...d.advisees.map((p) => row("Advisees", p, p.endYear ?? p.startYear)),
    ...d.coauthors.map((p) => row("Co-authors", p, p.lastYear)),
    ...d.collaborators.map((p) => row("Collaborators", p, p.endYear ?? p.startYear)),
  ];
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function coaCsv(d: SupportDraft): string {
  const header = ["Table", "Name", "Organizational affiliation", "Last active"];
  return [header, ...coaRows(d).map((r) => [r.table, r.name, r.affiliation, r.lastActive])]
    .map((cols) => cols.map(csvCell).join(","))
    .join("\n");
}

/** Read the add/edit form into the database's shape. Returns an error sentence when invalid. */
export function readSupportForm(get: (k: string) => string): { ok: true; value: Record<string, string | null> } | { ok: false; error: string } {
  const title = get("title").trim();
  if (title.length < 3) return { ok: false, error: "Write the title of the grant or support." };
  const year = (k: string): string | null => {
    const v = get(k).trim();
    return /^(19|20|21)\d{2}$/.test(v) ? v : null;
  };
  const start = year("startYear");
  const end = year("endYear");
  if (start && end && Number(end) < Number(start)) return { ok: false, error: "The end year comes after the start year." };
  const months = get("effortMonths").trim().replace(",", ".");
  if (months !== "" && !(Number(months) >= 0 && Number(months) <= 12)) return { ok: false, error: "Person months go from 0 to 12." };
  const kind = SUPPORT_KINDS.some((k) => k.key === get("kind")) ? get("kind") : "grant";
  const status = SUPPORT_STATUSES.some((k) => k.key === get("status")) ? get("status") : "current";
  const opt = (k: string) => get(k).trim() || null;
  return {
    ok: true,
    value: {
      title,
      kind,
      status,
      funder: opt("funder"),
      role: opt("role"),
      startYear: start,
      endYear: end,
      effortMonths: months === "" ? null : months,
      amountNote: opt("amountNote"),
      overlapNote: opt("overlapNote"),
    },
  };
}
