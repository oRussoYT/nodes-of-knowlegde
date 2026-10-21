// Parsers for public programme pages. Pure; unit-tested; fail closed. The
// public projection carries counts only -- no names.

export interface PublicProgramme {
  organizationId: string;
  organizationName: string;
  programme: string;
  graduates: number;
  known: number;
  firstYear: number | null;
  lastYear: number | null;
  demo: number;
  bySector: { sector: string; people: number }[];
  byCountry: { country: string | null; people: number }[];
  byDecade: { decade: number | null; graduates: number }[];
  destinations: { institution: string; people: number }[];
}

export interface PublicProgrammeEntry {
  organizationId: string;
  organizationName: string;
  programme: string;
  graduates: number;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}
const str = (v: unknown) => (typeof v === "string" ? v : null);
const list = (v: unknown) => (Array.isArray(v) ? v.filter(isRecord) : []);

export function parsePublicProgramme(input: unknown): PublicProgramme | null {
  if (!isRecord(input)) return null;
  const organizationId = str(input.organizationId);
  const organizationName = str(input.organizationName);
  const programme = str(input.programme);
  const graduates = num(input.graduates);
  if (!organizationId || !organizationName || !programme || graduates === null) return null;
  return {
    organizationId,
    organizationName,
    programme,
    graduates,
    known: num(input.known) ?? 0,
    firstYear: num(input.firstYear),
    lastYear: num(input.lastYear),
    demo: num(input.demo) ?? 0,
    bySector: list(input.bySector).map((r) => ({ sector: str(r.sector) ?? "unknown", people: num(r.people) ?? 0 })),
    byCountry: list(input.byCountry).map((r) => ({ country: str(r.country), people: num(r.people) ?? 0 })),
    byDecade: list(input.byDecade).map((r) => ({ decade: num(r.decade), graduates: num(r.graduates) ?? 0 })),
    destinations: list(input.destinations)
      .map((r) => ({ institution: str(r.institution) ?? "", people: num(r.people) ?? 0 }))
      .filter((r) => r.institution !== ""),
  };
}

export function parsePublicProgrammes(input: unknown): PublicProgrammeEntry[] {
  return list(input)
    .map((r) => ({
      organizationId: str(r.organization_id) ?? "",
      organizationName: str(r.organization_name) ?? "",
      programme: str(r.programme) ?? "",
      graduates: num(r.graduates) ?? 0,
    }))
    .filter((r) => r.organizationId && r.organizationName && r.programme);
}

export function programmePath(organizationId: string, programme: string): string {
  return `/programmes/${organizationId}/${encodeURIComponent(programme)}`;
}
