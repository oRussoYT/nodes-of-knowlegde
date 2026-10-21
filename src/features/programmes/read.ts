// Server-only reads for public programme pages (callable signed out).

import { createClient } from "@/lib/supabase/server";

import { parsePublicProgramme, parsePublicProgrammes, type PublicProgramme, type PublicProgrammeEntry } from "./parse";

export async function getPublicProgramme(organizationId: string, programme: string): Promise<PublicProgramme | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_programme", { p_organization_id: organizationId, p_programme: programme });
  return error ? null : parsePublicProgramme(data);
}

export async function listPublicProgrammes(): Promise<PublicProgrammeEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_public_programmes");
  return error ? [] : parsePublicProgrammes(data);
}
