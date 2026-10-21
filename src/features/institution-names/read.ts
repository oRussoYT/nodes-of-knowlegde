// Server-only read; the database decides who may see it and fails closed.

import { createClient } from "@/lib/supabase/server";

import { parseCuratedNames, type CuratedName } from "./parse";

export async function listCuratedNames(organizationId: string): Promise<CuratedName[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_list_organization_names", { p_organization_id: organizationId });
  return error ? null : parseCuratedNames(data);
}
