// A forum per Node, for its members. Pure -- unit-tested.

export interface ThreadSummary {
  id: string;
  title: string;
  author: string;
  posts: number;
  lastPostAt: string;
}

export interface Thread {
  id: string;
  title: string;
  nodeSlug: string;
  canModerate: boolean;
  posts: { id: string; author: string; body: string; createdAt: string; isMine: boolean }[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** null = not a member (or unknown Node); [] = no threads yet. */
export function parseThreads(data: unknown): ThreadSummary[] | null {
  if (!Array.isArray(data)) return null;
  return data.filter(isRecord).flatMap((t) =>
    typeof t.id === "string" && typeof t.title === "string"
      ? [{ id: t.id, title: t.title, author: String(t.author ?? "A member"), posts: Number(t.posts) || 0, lastPostAt: String(t.lastPostAt ?? "") }]
      : [],
  );
}

export function parseThread(data: unknown): Thread | null {
  if (!isRecord(data) || typeof data.id !== "string" || typeof data.title !== "string") return null;
  return {
    id: data.id,
    title: data.title,
    nodeSlug: String(data.nodeSlug ?? ""),
    canModerate: data.canModerate === true,
    posts: Array.isArray(data.posts)
      ? data.posts.filter(isRecord).flatMap((p) =>
          typeof p.id === "string" && typeof p.body === "string"
            ? [{ id: p.id, author: String(p.author ?? "A member"), body: p.body, createdAt: String(p.createdAt ?? ""), isMine: p.isMine === true }]
            : [],
        )
      : [],
  };
}

export function checkPost(title: string | null, body: string): { ok: true } | { ok: false; error: string } {
  if (title !== null && (title.trim().length < 3 || title.trim().length > 200)) return { ok: false, error: "The title needs 3 to 200 characters." };
  if (body.trim().length < 1) return { ok: false, error: "Write something first." };
  if (body.length > 10_000) return { ok: false, error: "The message is too long (10,000 characters at most)." };
  return { ok: true };
}

/** "28 Oct 2026, 21:05" in UTC, stable for server rendering. */
export function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${m} ${d.getUTCFullYear()}, ${hh}:${mm} UTC`;
}
