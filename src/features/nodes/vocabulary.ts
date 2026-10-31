// Each Node's own words: its names for roles (mapped to the common base) and
// its fields of study. Pure parsing plus the read.

import { createClient } from "@/lib/supabase/server";

export interface VocabularyEntry {
  id: string;
  kind: "role" | "field";
  label: string;
  baseKey: string | null;
  baseLabel: string | null;
  description: string | null;
}

export function parseVocabulary(data: unknown): VocabularyEntry[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((r) => {
    if (typeof r !== "object" || r === null) return [];
    const o = r as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.label !== "string" || (o.kind !== "role" && o.kind !== "field")) return [];
    const s = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);
    return [{ id: o.id, kind: o.kind, label: o.label, baseKey: s(o.baseKey), baseLabel: s(o.baseLabel), description: s(o.description) }];
  });
}

export async function getNodeVocabulary(slug: string): Promise<VocabularyEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("node_vocabulary_for", { p_slug: slug });
  return error ? [] : parseVocabulary(data);
}
