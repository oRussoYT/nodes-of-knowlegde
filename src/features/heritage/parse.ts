// "Everything has a history": projects, sites, expeditions, collections,
// species, photos, documents, old maps, oral histories. Pure -- unit-tested.

export interface HeritageKind {
  key: string;
  label: string;
  plural: string;
  isMedia: boolean;
}

export interface HeritageLink {
  id: string;
  role: string | null;
  personId: string | null;
  personName: string | null;
  organizationId: string | null;
  organizationName: string | null;
  itemId: string | null;
  itemTitle: string | null;
}

export interface HeritageItem {
  id: string;
  kind: string;
  kindLabel: string;
  isMedia: boolean;
  title: string;
  summary: string | null;
  scientificName: string | null;
  startYear: number | null;
  endYear: number | null;
  isOngoing: boolean;
  place: string | null;
  latitude: number | null;
  longitude: number | null;
  organizationId: string | null;
  organizationName: string | null;
  hasFile: boolean;
  filePath: string | null;
  externalUrl: string | null;
  sourceNote: string;
  visibility: "members" | "restricted";
  reviewStatus: "proposed" | "accepted" | "rejected";
  verificationStatus: "provisional" | "confirmed";
  decisionNote: string | null;
  isMine: boolean;
  role: string | null;
  links: HeritageLink[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}
function int(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) ? v : null;
}
function float(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function parseKinds(data: unknown): HeritageKind[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isRecord).flatMap((k) =>
    str(k.key) && str(k.label) ? [{ key: k.key as string, label: k.label as string, plural: str(k.plural) ?? (k.label as string), isMedia: k.isMedia === true }] : [],
  );
}

export function parseCounts(data: unknown): (HeritageKind & { count: number })[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isRecord).flatMap((k) =>
    str(k.kind) && str(k.label)
      ? [{ key: k.kind as string, label: k.label as string, plural: str(k.plural) ?? (k.label as string), isMedia: k.isMedia === true, count: int(k.count) ?? 0 }]
      : [],
  );
}

export function parseItem(raw: unknown): HeritageItem | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const kind = str(raw.kind);
  const title = str(raw.title);
  const sourceNote = str(raw.sourceNote);
  if (!id || !kind || !title || !sourceNote) return null;
  return {
    id,
    kind,
    kindLabel: str(raw.kindLabel) ?? kind,
    isMedia: raw.isMedia === true,
    title,
    summary: str(raw.summary),
    scientificName: str(raw.scientificName),
    startYear: int(raw.startYear),
    endYear: int(raw.endYear),
    isOngoing: raw.isOngoing === true,
    place: str(raw.place),
    latitude: float(raw.latitude),
    longitude: float(raw.longitude),
    organizationId: str(raw.organizationId),
    organizationName: str(raw.organizationName),
    hasFile: raw.hasFile === true,
    filePath: str(raw.filePath),
    externalUrl: str(raw.externalUrl),
    sourceNote,
    visibility: raw.visibility === "restricted" ? "restricted" : "members",
    reviewStatus: raw.reviewStatus === "accepted" || raw.reviewStatus === "rejected" ? raw.reviewStatus : "proposed",
    verificationStatus: raw.verificationStatus === "confirmed" ? "confirmed" : "provisional",
    decisionNote: str(raw.decisionNote),
    isMine: raw.isMine === true,
    role: str(raw.role),
    links: Array.isArray(raw.links)
      ? raw.links.filter(isRecord).flatMap((l) =>
          str(l.id)
            ? [
                {
                  id: l.id as string,
                  role: str(l.role),
                  personId: str(l.personId),
                  personName: str(l.personName),
                  organizationId: str(l.organizationId),
                  organizationName: str(l.organizationName),
                  itemId: str(l.itemId),
                  itemTitle: str(l.itemTitle),
                },
              ]
            : [],
        )
      : [],
  };
}

export function parseItems(data: unknown): HeritageItem[] {
  return Array.isArray(data) ? data.map(parseItem).filter((i): i is HeritageItem => i !== null) : [];
}

/** "1987", "1987–1990", "since 1987", "" */
export function describeSpan(i: { startYear: number | null; endYear: number | null; isOngoing: boolean }): string {
  if (i.startYear === null) return "";
  if (i.isOngoing) return `since ${i.startYear}`;
  if (i.endYear !== null && i.endYear !== i.startYear) return `${i.startYear}–${i.endYear}`;
  return String(i.startYear);
}

/** How a file should be shown on the item page. */
export function fileView(path: string | null): "image" | "audio" | "pdf" | "other" | null {
  if (!path) return null;
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "image";
  if (["mp3", "m4a", "wav"].includes(ext)) return "audio";
  if (ext === "pdf") return "pdf";
  return "other";
}

export const HERITAGE_FILE_TYPES = [
  "application/pdf", "image/jpeg", "image/png", "image/webp", "image/tiff", "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav", "text/plain",
] as const;
export const HERITAGE_MAX_BYTES = 50 * 1024 * 1024;

export function heritageFileProblem(file: { type: string; size: number }): string | null {
  if (!(HERITAGE_FILE_TYPES as readonly string[]).includes(file.type)) return "Use a PDF, an image, an audio file (MP3, M4A, WAV) or a text file.";
  if (file.size > HERITAGE_MAX_BYTES) return "The file is larger than 50 MB.";
  return null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type HeritageFormResult = { ok: true; payload: Record<string, unknown> } | { ok: false; error: string };

export function parseHeritageForm(form: FormData, kinds: string[]): HeritageFormResult {
  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const kind = get("kind");
  if (!kinds.includes(kind)) return { ok: false, error: "Choose what it is." };
  const title = get("title");
  if (title.length < 2 || title.length > 300) return { ok: false, error: "Give it a title (2 to 300 characters)." };
  const year = (raw: string): number | null | "bad" => {
    if (raw === "") return null;
    if (!/^\d{4}$/.test(raw)) return "bad";
    const n = Number(raw);
    return n >= 1500 && n <= 2100 ? n : "bad";
  };
  const start = year(get("startYear"));
  const end = year(get("endYear"));
  if (start === "bad" || end === "bad") return { ok: false, error: "Years must have four digits, between 1500 and 2100." };
  if (end !== null && (start === null || end < start)) return { ok: false, error: "The end year needs a start year before it." };
  const ongoing = form.get("isOngoing") === "on";
  if (ongoing && (start === null || end !== null)) return { ok: false, error: "“Still going” needs a start year and no end year." };
  const sourceNote = get("sourceNote");
  if (sourceNote === "" || sourceNote.length > 1000) return { ok: false, error: "Say what documents it — an album, an archive box, a field book, a recording." };
  const summary = get("summary");
  if (summary.length > 5000) return { ok: false, error: "The description is too long (5,000 characters at most)." };
  const lat = get("latitude");
  const lon = get("longitude");
  let latitude: number | null = null;
  let longitude: number | null = null;
  if (lat !== "" || lon !== "") {
    latitude = Number(lat.replace(",", "."));
    longitude = Number(lon.replace(",", "."));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || lat === "" || lon === "") {
      return { ok: false, error: "Give both latitude and longitude as decimal numbers (e.g. -2.40 and -59.90), or neither." };
    }
  }
  const url = get("externalUrl");
  if (url !== "" && !/^https?:\/\/\S+$/i.test(url)) return { ok: false, error: "The link should start with https://" };
  const org = get("organizationId");
  const people = form.getAll("personId").map(String).filter((p) => UUID.test(p));
  const role = get("personRole").slice(0, 120);
  return {
    ok: true,
    payload: {
      kind,
      title,
      summary: summary || null,
      scientificName: get("scientificName") || null,
      startYear: start,
      endYear: end,
      isOngoing: ongoing,
      place: get("place") || null,
      latitude,
      longitude,
      organizationId: UUID.test(org) ? org : null,
      filePath: get("filePath") || null,
      externalUrl: url || null,
      sourceNote,
      visibility: form.get("restricted") === "on" ? "restricted" : "members",
      links: [...new Set(people)].map((personId) => ({ personId, role: role || null })),
    },
  };
}
