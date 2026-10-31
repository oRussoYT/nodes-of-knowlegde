import { isNodeSlug } from "@/features/nodes/parse";
import { createClient } from "@/lib/supabase/server";

import { parseObservatory, parseObservatoryMore, type Observatory, type ObservatoryMore } from "./parse";

export async function getObservatory(slug: string): Promise<Observatory | null> {
  if (!isNodeSlug(slug)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("node_observatory", { p_slug: slug });
  return error ? null : parseObservatory(data);
}

export async function getObservatoryMore(slug: string): Promise<ObservatoryMore | null> {
  if (!isNodeSlug(slug)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("node_observatory_more", { p_slug: slug });
  return error ? null : parseObservatoryMore(data);
}
