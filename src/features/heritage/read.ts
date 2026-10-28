import { createClient } from "@/lib/supabase/server";

import { parseCounts, parseItem, parseItems, parseKinds, type HeritageItem, type HeritageKind } from "./parse";

export async function getHeritageKinds(): Promise<HeritageKind[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_heritage_kinds");
  return error ? [] : parseKinds(data);
}

export async function getHeritageCounts() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("heritage_counts");
  return error ? [] : parseCounts(data);
}

export async function listHeritage(kind: string | null, query: string | null): Promise<HeritageItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_heritage_items", {
    ...(kind ? { p_kind: kind } : {}),
    ...(query ? { p_query: query } : {}),
  });
  return error ? [] : parseItems(data);
}

export async function getHeritageItem(id: string): Promise<{ item: HeritageItem; fileUrl: string | null } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_heritage_item", { p_id: id });
  const item = error ? null : parseItem(data);
  if (!item) return null;
  let fileUrl: string | null = null;
  if (item.filePath) {
    const signed = await supabase.storage.from("heritage").createSignedUrl(item.filePath, 3600);
    fileUrl = signed.data?.signedUrl ?? null;
  }
  return { item, fileUrl };
}

export async function getHeritageFor(target: { personId?: string; organizationId?: string }): Promise<HeritageItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("heritage_for", {
    ...(target.personId ? { p_person_id: target.personId } : {}),
    ...(target.organizationId ? { p_organization_id: target.organizationId } : {}),
  });
  return error ? [] : parseItems(data);
}

export async function getHeritageProposals(): Promise<HeritageItem[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_list_heritage_proposals");
  return error ? null : parseItems(data);
}
