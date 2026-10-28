import { createClient } from "@/lib/supabase/server";

export interface PersonPrivacy {
  limitRevelations: boolean;
  isSelf: boolean;
  viewerIsSteward: boolean;
}

export function parsePrivacy(data: unknown): PersonPrivacy {
  const d = typeof data === "object" && data !== null && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  return { limitRevelations: d.limitRevelations === true, isSelf: d.isSelf === true, viewerIsSteward: d.viewerIsSteward === true };
}

export async function getPersonPrivacy(personId: string): Promise<PersonPrivacy> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("person_privacy_view", { p_person_id: personId });
  return parsePrivacy(error ? null : data);
}

export interface CareLabel {
  key: string;
  label: string;
  description: string;
}

export async function getCareOptions(): Promise<{ labels: CareLabel[]; communities: { id: string; name: string }[] }> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_care_options");
  const d = (data ?? {}) as { labels?: CareLabel[]; communities?: { id: string; name: string }[] };
  return { labels: Array.isArray(d.labels) ? d.labels : [], communities: Array.isArray(d.communities) ? d.communities : [] };
}

export async function getHeritageCare(itemId: string): Promise<{ community: { id: string; name: string } | null; labels: CareLabel[] }> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("heritage_care", { p_item_id: itemId });
  const d = (data ?? {}) as { community?: { id: string; name: string } | null; labels?: CareLabel[] };
  return { community: d.community ?? null, labels: Array.isArray(d.labels) ? d.labels : [] };
}
