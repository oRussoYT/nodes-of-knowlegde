// The university package: report by level, CAPES export, plan requests.
// Pure -- unit-tested.

import { INSTITUTION_KINDS, type InstitutionKind, type PlanKey } from "@/config/plans";

export interface LevelRow {
  key: string;
  label: string;
  labelPt: string;
  isPostgraduate: boolean;
  graduates: number;
  found: number;
  academia: number;
  business: number;
  government: number;
  nonprofit: number;
  abroad: number;
  medianYearsToDestination: number | null;
}

export interface UniversityReport {
  homeCountry: string;
  levels: LevelRow[];
  totals: {
    graduates: number;
    found: number;
    academia: number;
    beyondAcademia: number;
    abroad: number;
    countries: number;
    institutions: number;
    demo: number;
  };
  method: string[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

export function parseUniversityReport(data: unknown): UniversityReport | null {
  if (!isRecord(data)) return null;
  const t = isRecord(data.totals) ? data.totals : {};
  return {
    homeCountry: str(data.homeCountry) ?? "BR",
    levels: Array.isArray(data.levels)
      ? data.levels.filter(isRecord).flatMap((l) =>
          str(l.key)
            ? [
                {
                  key: l.key as string,
                  label: str(l.label) ?? (l.key as string),
                  labelPt: str(l.labelPt) ?? "",
                  isPostgraduate: l.isPostgraduate === true,
                  graduates: num(l.graduates),
                  found: num(l.found),
                  academia: num(l.academia),
                  business: num(l.business),
                  government: num(l.government),
                  nonprofit: num(l.nonprofit),
                  abroad: num(l.abroad),
                  medianYearsToDestination: typeof l.medianYearsToDestination === "number" ? l.medianYearsToDestination : null,
                },
              ]
            : [],
        )
      : [],
    totals: {
      graduates: num(t.graduates),
      found: num(t.found),
      academia: num(t.academia),
      beyondAcademia: num(t.beyondAcademia),
      abroad: num(t.abroad),
      countries: num(t.countries),
      institutions: num(t.institutions),
      demo: num(t.demo),
    },
    method: Array.isArray(data.method) ? data.method.filter((m): m is string => typeof m === "string") : [],
  };
}

/** "3 of 4 (75%)"; "—" when there is nothing to divide. */
export function share(part: number, whole: number): string {
  if (whole <= 0) return "—";
  return `${part} of ${whole} (${Math.round((part / whole) * 100)}%)`;
}

/** Ranking-style indicators of the institution, each with what it counts. */
export function rankingIndicators(r: UniversityReport): { label: string; value: string; counts: string }[] {
  const t = r.totals;
  return [
    { label: "Graduates with a known destination", value: share(t.found, t.graduates), counts: "Located graduates of all graduates on record" },
    { label: "In universities or research institutes", value: share(t.academia, t.found), counts: "Academic employment outcome (of located graduates)" },
    { label: "In companies, government, NGOs or health", value: share(t.beyondAcademia, t.found), counts: "Employment beyond academia (of located graduates)" },
    { label: `Working outside ${r.homeCountry}`, value: share(t.abroad, t.found), counts: "International mobility (of located graduates)" },
    { label: "Countries reached", value: String(t.countries), counts: "Distinct destination countries" },
    { label: "Institutions reached", value: String(t.institutions), counts: "Distinct destination institutions" },
  ];
}

export interface CapesRow {
  displayName: string;
  orcid: string | null;
  levelPt: string;
  programme: string | null;
  graduationYear: number | null;
  destinationCategory: string;
  destinationInstitution: string | null;
  destinationCountry: string | null;
  destinationYear: number | null;
  yearsAfter: number | null;
  destinationSource: string | null;
  confirmedAt: string | null;
  isDemo: boolean;
}

export function parseCapesRows(data: unknown): CapesRow[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isRecord).flatMap((r) =>
    str(r.display_name)
      ? [
          {
            displayName: r.display_name as string,
            orcid: str(r.orcid),
            levelPt: str(r.level_pt) ?? "",
            programme: str(r.programme),
            graduationYear: typeof r.graduation_year === "number" ? r.graduation_year : null,
            destinationCategory: str(r.destination_category) ?? "Não localizado",
            destinationInstitution: str(r.destination_institution),
            destinationCountry: str(r.destination_country),
            destinationYear: typeof r.destination_year === "number" ? r.destination_year : null,
            yearsAfter: typeof r.years_after === "number" ? r.years_after : null,
            destinationSource: str(r.destination_source),
            confirmedAt: str(r.confirmed_at),
            isDemo: r.is_demo === true,
          },
        ]
      : [],
  );
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",;\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CAPES "egressos" CSV (Portuguese headers, semicolon for Brazilian Excel). */
export function capesToCsv(rows: CapesRow[]): string {
  const header = [
    "Nome", "ORCID", "Nível", "Programa", "Ano de titulação", "Situação/destino", "Instituição de destino",
    "País de destino", "Ano da informação", "Anos após a titulação", "Fonte", "Confirmado em", "Registro de demonstração",
  ];
  const lines = rows.map((r) =>
    [
      r.displayName, r.orcid, r.levelPt, r.programme, r.graduationYear, r.destinationCategory, r.destinationInstitution,
      r.destinationCountry, r.destinationYear, r.yearsAfter, r.destinationSource, r.confirmedAt?.slice(0, 10), r.isDemo ? "sim" : "não",
    ].map(cell).join(";"),
  );
  return "﻿" + [header.map(cell).join(";"), ...lines].join("\r\n") + "\r\n";
}

export type PlanRequestResult = { ok: true; payload: Record<string, unknown> } | { ok: false; error: string };

export function parsePlanRequestForm(form: FormData): PlanRequestResult {
  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const institutionName = get("institutionName");
  const kind = get("institutionKind");
  const contactName = get("contactName");
  const people = get("peopleEstimate");
  const message = get("message");
  if (institutionName.length < 2 || institutionName.length > 300) return { ok: false, error: "Write the institution's name." };
  if (!INSTITUTION_KINDS.some((k) => k.key === kind)) return { ok: false, error: "Choose what kind of institution it is." };
  if (contactName.length < 2 || contactName.length > 200) return { ok: false, error: "Write your name." };
  if (people !== "" && !/^\d{1,8}$/.test(people)) return { ok: false, error: "The number of people should be a whole number." };
  if (message.length > 3000) return { ok: false, error: "The message is too long (3,000 characters at most)." };
  return {
    ok: true,
    payload: {
      institutionName,
      institutionKind: kind as InstitutionKind,
      contactName,
      contactRole: get("contactRole") || null,
      country: get("country") || null,
      peopleEstimate: people || null,
      message: message || null,
    },
  };
}

export type PlanRequestStatus = "new" | "in_conversation" | "approved" | "declined";

export interface PlanRequest {
  id: string;
  institutionName: string;
  institutionKind: string;
  plan: PlanKey;
  contactName: string;
  contactRole: string | null;
  country: string | null;
  peopleEstimate: number | null;
  message: string | null;
  status: PlanRequestStatus;
  answerNote: string | null;
  createdAt: string;
  requesterEmail: string | null;
}

export function parsePlanRequests(data: unknown): PlanRequest[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isRecord).flatMap((r) => {
    const id = str(r.id);
    const name = str(r.institutionName);
    const createdAt = str(r.createdAt);
    if (!id || !name || !createdAt) return [];
    const plan = r.plan === "pro_bono" || r.plan === "university" ? r.plan : "institution";
    const status = r.status === "in_conversation" || r.status === "approved" || r.status === "declined" ? r.status : "new";
    return [
      {
        id,
        institutionName: name,
        institutionKind: str(r.institutionKind) ?? "other",
        plan,
        contactName: str(r.contactName) ?? "",
        contactRole: str(r.contactRole),
        country: str(r.country),
        peopleEstimate: typeof r.peopleEstimate === "number" ? r.peopleEstimate : null,
        message: str(r.message),
        status,
        answerNote: str(r.answerNote),
        createdAt,
        requesterEmail: str(r.requesterEmail),
      },
    ];
  });
}

export const REQUEST_STATUS_LABEL: Record<PlanRequestStatus, string> = {
  new: "Received",
  in_conversation: "In conversation",
  approved: "Approved",
  declined: "Declined",
};
