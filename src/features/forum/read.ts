import { isNodeSlug } from "@/features/nodes/parse";
import { createClient } from "@/lib/supabase/server";

import { parseThread, parseThreads, type Thread, type ThreadSummary } from "./parse";

export async function getThreads(slug: string): Promise<ThreadSummary[] | null> {
  if (!isNodeSlug(slug)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("forum_threads_for", { p_slug: slug });
  return error ? null : parseThreads(data);
}

export async function getThread(id: string): Promise<Thread | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("forum_thread", { p_thread_id: id });
  return error ? null : parseThread(data);
}

export async function getNodeLinks(slug: string): Promise<{ slug: string; name: string; shortName: string | null; peopleInCommon: number }[]> {
  if (!isNodeSlug(slug)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("node_links", { p_slug: slug });
  return !error && Array.isArray(data)
    ? data.flatMap((r) => {
        const o = r as Record<string, unknown>;
        return typeof o.slug === "string" ? [{ slug: o.slug, name: String(o.name ?? ""), shortName: typeof o.shortName === "string" ? o.shortName : null, peopleInCommon: Number(o.peopleInCommon) || 0 }] : [];
      })
    : [];
}
