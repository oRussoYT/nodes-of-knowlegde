// Knowledge Nodes (get_node, list_nodes, my_nodes). Pure parsing -- unit-tested.
// A Node's public face carries counts only, never names.

export type NodePlan = "pro_bono" | "paid";

export interface NodeCounts {
  people: number;
  institutions: number;
  works: number;
  members: number;
  firstYear: number | null;
}

export interface NodeInstitution {
  id: string;
  name: string;
  shortName: string | null;
  role: "core" | "host" | "partner";
  status: string | null;
}

export interface NodeSummary {
  slug: string;
  name: string;
  shortName: string | null;
  tagline: string | null;
  accentColor: string | null;
  coverPhoto: string | null;
  plan: NodePlan;
  counts: NodeCounts;
}

export interface NodeDetail extends NodeSummary {
  id: string;
  description: string | null;
  status: "active" | "paused";
  institutions: NodeInstitution[];
  isMember: boolean;
}

export interface MyNode {
  slug: string;
  name: string;
  shortName: string | null;
  joinedAt: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function int(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COVER = /^\/photos\/[a-z0-9-]+$/;
const COLOR = /^#[0-9a-fA-F]{6}$/;

export function isNodeSlug(value: unknown): value is string {
  return typeof value === "string" && value.length <= 40 && SLUG.test(value);
}

function parseCounts(raw: unknown): NodeCounts {
  const r = isRecord(raw) ? raw : {};
  return {
    people: int(r.people),
    institutions: int(r.institutions),
    works: int(r.works),
    members: int(r.members),
    firstYear: typeof r.firstYear === "number" ? Math.trunc(r.firstYear) : null,
  };
}

function parseSummary(r: Record<string, unknown>): NodeSummary | null {
  const slug = str(r.slug);
  const name = str(r.name);
  if (!slug || !isNodeSlug(slug) || !name) return null;
  const cover = str(r.coverPhoto);
  const color = str(r.accentColor);
  return {
    slug,
    name,
    shortName: str(r.shortName),
    tagline: str(r.tagline),
    accentColor: color && COLOR.test(color) ? color : null,
    coverPhoto: cover && COVER.test(cover) ? cover : null,
    plan: r.plan === "paid" ? "paid" : "pro_bono",
    counts: parseCounts(r.counts),
  };
}

export function parseNodeList(data: unknown): NodeSummary[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isRecord).map(parseSummary).filter((n): n is NodeSummary => n !== null);
}

export function parseNodeDetail(data: unknown): NodeDetail | null {
  if (!isRecord(data)) return null;
  const summary = parseSummary(data);
  const id = str(data.id);
  if (!summary || !id) return null;
  const institutions: NodeInstitution[] = Array.isArray(data.institutions)
    ? data.institutions.filter(isRecord).flatMap((i) => {
        const iid = str(i.id);
        const iname = str(i.name);
        if (!iid || !iname) return [];
        const role = i.role === "host" || i.role === "partner" ? i.role : "core";
        return [{ id: iid, name: iname, shortName: str(i.shortName), role, status: str(i.status) }];
      })
    : [];
  return {
    ...summary,
    id,
    description: str(data.description),
    status: data.status === "paused" ? "paused" : "active",
    institutions,
    isMember: data.isMember === true,
  };
}

export function parseMyNodes(data: unknown): MyNode[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isRecord).flatMap((r) => {
    const slug = str(r.slug);
    const name = str(r.name);
    return slug && name && isNodeSlug(slug) ? [{ slug, name, shortName: str(r.shortName), joinedAt: str(r.joinedAt) }] : [];
  });
}

export const ROLE_LABELS: Record<NodeInstitution["role"], string> = {
  core: "The project",
  host: "Host institution",
  partner: "Partner",
};

export const PLAN_LABELS: Record<NodePlan, string> = {
  pro_bono: "Pro bono — conservation research",
  paid: "Institutional plan",
};

/** The short label of a Node, e.g. "PDBFF". */
export function nodeLabel(node: { shortName: string | null; name: string }): string {
  return node.shortName ?? node.name;
}
