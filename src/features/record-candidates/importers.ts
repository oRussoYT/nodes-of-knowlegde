// Turning a person's own CV sources into proposals (never into facts):
// ORCID (public record: employments and educations) and the Currículo Lattes
// XML that the person downloads from the CNPq site. Pure parsing here --
// unit-tested; the ORCID fetch is a thin adapter.

export interface ImportedPeriod {
  /** Stable key for the item in its source, so re-importing adds nothing twice. */
  externalKey: string;
  organizationName: string;
  capacity: "student" | "researcher" | "staff";
  startYear: number | null;
  endYear: number | null;
  isOngoing: boolean;
  summary: string | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function yearOf(v: unknown): number | null {
  if (!isRecord(v) || !isRecord(v.year)) return null;
  const n = Number(v.year.value);
  return Number.isInteger(n) && n >= 1500 && n <= 2100 ? n : null;
}

function clean(s: unknown): string | null {
  return typeof s === "string" && s.trim() !== "" ? s.trim() : null;
}

function finish(p: Omit<ImportedPeriod, "isOngoing" | "endYear"> & { endYear: number | null; ongoingHint: boolean }): ImportedPeriod {
  let end = p.endYear;
  let start = p.startYear;
  if (end !== null && start !== null && end < start) [start, end] = [end, start];
  if (end !== null && start === null) start = end;
  const isOngoing = p.ongoingHint && end === null && start !== null;
  return { externalKey: p.externalKey, organizationName: p.organizationName, capacity: p.capacity, startYear: start, endYear: end, isOngoing, summary: p.summary };
}

/** "https://orcid.org/0000-..." or bare -> bare iD, or null. */
export function orcidId(value: string | null | undefined): string | null {
  if (!value) return null;
  const bare = value.trim().replace(/^https?:\/\/(www\.)?orcid\.org\//i, "").replace(/\/$/, "").toUpperCase();
  return /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(bare) ? bare : null;
}

/** Periods from an ORCID v3.0 /employments or /educations response. */
export function periodsFromOrcid(raw: unknown, section: "employment" | "education"): ImportedPeriod[] {
  if (!isRecord(raw) || !Array.isArray(raw["affiliation-group"])) return [];
  const out: ImportedPeriod[] = [];
  for (const group of raw["affiliation-group"]) {
    if (!isRecord(group) || !Array.isArray(group.summaries)) continue;
    for (const s of group.summaries) {
      const item = isRecord(s) ? s[`${section}-summary`] : null;
      if (!isRecord(item) || !isRecord(item.organization)) continue;
      const name = clean(item.organization.name);
      const putCode = item["put-code"];
      if (!name || (typeof putCode !== "number" && typeof putCode !== "string")) continue;
      const role = clean(item["role-title"]);
      const dept = clean(item["department-name"]);
      out.push(
        finish({
          externalKey: `${section}-${putCode}`,
          organizationName: name.slice(0, 300),
          capacity: section === "education" ? "student" : "researcher",
          startYear: yearOf(item["start-date"]),
          endYear: yearOf(item["end-date"]),
          ongoingHint: item["end-date"] === null || item["end-date"] === undefined,
          summary: [role, dept].filter(Boolean).join(", ").slice(0, 300) || null,
        }),
      );
    }
  }
  return out;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m);
}

function attributes(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([A-Z0-9-]+)="([^"]*)"/g)) {
    out[m[1]!] = decodeEntities(m[2]!);
  }
  return out;
}

function lattesYear(v: string | undefined): number | null {
  if (!v || !/^\d{4}$/.test(v.trim())) return null;
  const n = Number(v);
  return n >= 1500 && n <= 2100 ? n : null;
}

const DEGREES: Record<string, string> = {
  GRADUACAO: "Graduação",
  ESPECIALIZACAO: "Especialização",
  MESTRADO: "Mestrado",
  "MESTRADO-PROFISSIONALIZANTE": "Mestrado profissional",
  DOUTORADO: "Doutorado",
  "POS-DOUTORADO": "Pós-doutorado",
};

/** Periods from a Currículo Lattes XML export (formação + atuação profissional). */
export function periodsFromLattes(xml: string): { name: string | null; periods: ImportedPeriod[] } {
  const out: ImportedPeriod[] = [];
  const nameMatch = /<DADOS-GERAIS\b([^>]*)>/.exec(xml);
  const name = nameMatch ? attributes(nameMatch[1]!)["NOME-COMPLETO"] ?? null : null;

  const formacao = /<FORMACAO-ACADEMICA-TITULACAO\b[^>]*>([\s\S]*?)<\/FORMACAO-ACADEMICA-TITULACAO>/.exec(xml)?.[1] ?? "";
  let i = 0;
  for (const m of formacao.matchAll(/<(GRADUACAO|ESPECIALIZACAO|MESTRADO|MESTRADO-PROFISSIONALIZANTE|DOUTORADO|POS-DOUTORADO)\b([^>]*?)\/?>/g)) {
    const a = attributes(m[2]!);
    const inst = a["NOME-INSTITUICAO"]?.trim();
    if (!inst) continue;
    i += 1;
    const course = a["NOME-CURSO"]?.trim();
    const status = a["STATUS-DO-CURSO"]?.trim();
    out.push(
      finish({
        externalKey: `formacao-${m[1]}-${a["SEQUENCIA-FORMACAO"] ?? i}`,
        organizationName: inst.slice(0, 300),
        capacity: m[1] === "POS-DOUTORADO" ? "researcher" : "student",
        startYear: lattesYear(a["ANO-DE-INICIO"]),
        endYear: lattesYear(a["ANO-DE-CONCLUSAO"] ?? a["ANO-DE-OBTENCAO-DO-TITULO"]),
        ongoingHint: status === "EM_ANDAMENTO",
        summary: [DEGREES[m[1]!], course].filter(Boolean).join(" em ").slice(0, 300) || null,
      }),
    );
  }

  let j = 0;
  for (const block of xml.matchAll(/<ATUACAO-PROFISSIONAL\b([^>]*)>([\s\S]*?)<\/ATUACAO-PROFISSIONAL>/g)) {
    const inst = attributes(block[1]!)["NOME-INSTITUICAO"]?.trim();
    if (!inst) continue;
    for (const v of block[2]!.matchAll(/<VINCULOS\b([^>]*?)\/?>/g)) {
      const a = attributes(v[1]!);
      j += 1;
      const role = (a["OUTRO-ENQUADRAMENTO-FUNCIONAL-INFORMADO"] || a["OUTRO-VINCULO-INFORMADO"] || a["ENQUADRAMENTO-FUNCIONAL"] || "").trim();
      const end = lattesYear(a["ANO-FIM"]);
      out.push(
        finish({
          externalKey: `atuacao-${a["SEQUENCIA-HISTORICO"] ?? j}-${inst.slice(0, 40)}`,
          organizationName: inst.slice(0, 300),
          capacity: /professor|pesquisador|researcher|cientista/i.test(role) || role === "" ? "researcher" : "staff",
          startYear: lattesYear(a["ANO-INICIO"]),
          endYear: end,
          ongoingHint: (a["ANO-FIM"] ?? "").trim() === "",
          summary: role ? role.slice(0, 300) : null,
        }),
      );
    }
  }
  return { name, periods: out };
}

/** Decodes an uploaded Lattes file (CNPq exports ISO-8859-1). */
export function decodeLattes(bytes: Uint8Array): string {
  const head = new TextDecoder("latin1").decode(bytes.slice(0, 200));
  const encoding = /encoding="([^"]+)"/i.exec(head)?.[1]?.toLowerCase() ?? "utf-8";
  try {
    return new TextDecoder(encoding === "iso-8859-1" ? "latin1" : encoding).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/** Network adapter: ORCID public record sections. Null on failure. */
export async function fetchOrcidPeriods(id: string): Promise<ImportedPeriod[] | null> {
  const get = async (section: "employments" | "educations") => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      const r = await fetch(`https://pub.orcid.org/v3.0/${id}/${section}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      });
      return r.ok ? await r.json() : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
  const [emp, edu] = await Promise.all([get("employments"), get("educations")]);
  if (emp === null && edu === null) return null;
  return [...periodsFromOrcid(edu, "education"), ...periodsFromOrcid(emp, "employment")];
}
