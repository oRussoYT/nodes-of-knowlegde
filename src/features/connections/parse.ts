// Connections by shared themes, methods, organisms and places -- always with
// the reason, never ranked. Pure -- unit-tested.

export type TopicKind = "theme" | "method" | "organism" | "place";

export const TOPIC_KINDS: { key: TopicKind; label: string; plural: string; example: string }[] = [
  { key: "theme", label: "Theme", plural: "Themes", example: "forest fragmentation" },
  { key: "method", label: "Method", plural: "Methods", example: "mist netting" },
  { key: "organism", label: "Organism", plural: "Organisms", example: "Pithecia chrysocephala" },
  { key: "place", label: "Place", plural: "Places", example: "Reserva 1501" },
];

export interface Topic {
  id: string;
  kind: TopicKind;
  label: string;
  source: "person" | "ai" | "openalex" | "steward";
  status: "proposed" | "confirmed";
  reason: string | null;
}

export interface Connection {
  personId: string;
  displayName: string;
  inside: boolean;
  shared: { kind: TopicKind; label: string }[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function kindOf(v: unknown): TopicKind | null {
  return v === "theme" || v === "method" || v === "organism" || v === "place" ? v : null;
}

export function parseTopics(data: unknown): Topic[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isRecord).flatMap((t) => {
    const kind = kindOf(t.kind);
    if (typeof t.id !== "string" || !kind || typeof t.label !== "string") return [];
    const source = t.source === "ai" || t.source === "openalex" || t.source === "steward" ? t.source : "person";
    return [{ id: t.id, kind, label: t.label, source, status: t.status === "confirmed" ? "confirmed" : "proposed", reason: typeof t.reason === "string" ? t.reason : null }];
  });
}

export function parseConnections(data: unknown): { linked: boolean; topics: Topic[]; connections: Connection[] } {
  const d = isRecord(data) ? data : {};
  return {
    linked: typeof d.personId === "string",
    topics: parseTopics(d.topics),
    connections: Array.isArray(d.connections)
      ? d.connections.filter(isRecord).flatMap((c) =>
          typeof c.personId === "string" && typeof c.displayName === "string"
            ? [
                {
                  personId: c.personId,
                  displayName: c.displayName,
                  inside: c.inside === true,
                  shared: Array.isArray(c.shared)
                    ? c.shared.filter(isRecord).flatMap((s) => (kindOf(s.kind) && typeof s.label === "string" ? [{ kind: kindOf(s.kind)!, label: s.label }] : []))
                    : [],
                },
              ]
            : [],
        )
      : [],
  };
}

/** "Both work on forest fragmentation and mist netting." */
export function reasonSentence(shared: { kind: TopicKind; label: string }[]): string {
  if (shared.length === 0) return "";
  const labels = shared.map((s) => s.label);
  const list = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
  return `Both work on ${list}.`;
}

/** Topics typed one per line or separated by commas/semicolons. */
export function splitTopics(raw: string, kind: TopicKind): { kind: TopicKind; label: string }[] {
  const seen = new Set<string>();
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter((s) => s.length >= 2 && s.length <= 120)
    .filter((s) => {
      const k = s.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 40)
    .map((label) => ({ kind, label }));
}

export function topicPrompt(material: { name?: string; works?: string[]; institutions?: string[]; history?: string[] }): string {
  return [
    `From this record of ${material.name ?? "a researcher"}, suggest research topics they work on.`,
    "Only use what the record shows. Up to 12 items. Kinds: theme (a research subject), method, organism (a species or group, scientific name when known), place (a site or region).",
    'Answer with JSON only: {"topics":[{"kind":"theme","label":"","reason":"which work or item shows it"}]}',
    "",
    `Works: ${(material.works ?? []).slice(0, 80).join(" | ") || "none"}`,
    `Institutions: ${(material.institutions ?? []).join(" | ") || "none"}`,
    `History items: ${(material.history ?? []).slice(0, 40).join(" | ") || "none"}`,
  ].join("\n");
}

export function parseTopicSuggestions(raw: unknown): { kind: TopicKind; label: string; reason: string | null }[] {
  if (!isRecord(raw) || !Array.isArray(raw.topics)) return [];
  return raw.topics
    .filter(isRecord)
    .flatMap((t) => {
      const kind = kindOf(t.kind);
      const label = typeof t.label === "string" ? t.label.trim() : "";
      return kind && label.length >= 2 && label.length <= 120 ? [{ kind, label, reason: typeof t.reason === "string" ? t.reason.slice(0, 300) : null }] : [];
    })
    .slice(0, 12);
}
