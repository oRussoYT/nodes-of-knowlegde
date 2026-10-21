// Institution name history as stewards curate it (ROTEIRO etapa 0, refeito).
// Pure parsing and form validation -- no I/O, unit-tested.

export const NAME_TYPES = ["former", "alternative", "acronym", "indigenous", "local", "translation"] as const;
export type NameType = (typeof NAME_TYPES)[number];

export const NAME_TYPE_LABELS: Record<NameType, string> = {
  former: "Former name",
  alternative: "Other name",
  acronym: "Acronym",
  indigenous: "Indigenous name",
  local: "Local name",
  translation: "Translation",
};

export interface CuratedName {
  id: string;
  name: string;
  nameType: NameType;
  language: string | null;
  startYear: number | null;
  endYear: number | null;
  verified: boolean;
}

function isNameType(value: unknown): value is NameType {
  return typeof value === "string" && (NAME_TYPES as readonly string[]).includes(value);
}

function yearOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

/** Rows from steward_list_organization_names; unreadable rows are dropped. */
export function parseCuratedNames(data: unknown): CuratedName[] {
  if (!Array.isArray(data)) return [];
  const out: CuratedName[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.name !== "string" || !isNameType(r.name_type)) continue;
    out.push({
      id: r.id,
      name: r.name,
      nameType: r.name_type,
      language: typeof r.language === "string" && r.language ? r.language : null,
      startYear: yearOrNull(r.start_year),
      endYear: yearOrNull(r.end_year),
      verified: r.verification_status === "verified_admin" || r.verification_status === "verified_self",
    });
  }
  return out;
}

/** "1950–1987", "from 1950", "until 1987", or "" when undated. */
export function describePeriod(startYear: number | null, endYear: number | null): string {
  if (startYear !== null && endYear !== null) return startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`;
  if (startYear !== null) return `from ${startYear}`;
  if (endYear !== null) return `until ${endYear}`;
  return "";
}

export type NameFormResult =
  | { ok: true; value: { name: string; nameType: NameType; language: string | null; startYear: number | null; endYear: number | null } }
  | { ok: false; error: string };

function readYear(raw: string): number | null | "bad" {
  const t = raw.trim();
  if (t === "") return null;
  if (!/^\d{4}$/.test(t)) return "bad";
  const n = Number(t);
  return n >= 1500 && n <= 2100 ? n : "bad";
}

/** Validates the add-a-name form before it reaches the database (which checks again). */
export function readNameForm(fields: { name: string; nameType: string; language: string; startYear: string; endYear: string }): NameFormResult {
  const name = fields.name.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, error: "Write the name." };
  if (!isNameType(fields.nameType)) return { ok: false, error: "Choose what kind of name it is." };
  const start = readYear(fields.startYear);
  const end = readYear(fields.endYear);
  if (start === "bad" || end === "bad") return { ok: false, error: "Years are four digits, between 1500 and 2100." };
  if (start !== null && end !== null && end < start) return { ok: false, error: "The end year is before the start year." };
  const language = fields.language.trim();
  return { ok: true, value: { name, nameType: fields.nameType, language: language || null, startYear: start, endYear: end } };
}
