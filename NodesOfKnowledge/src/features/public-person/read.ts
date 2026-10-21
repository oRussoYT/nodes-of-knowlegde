// Server-only reads for public person pages. Callable signed out: the database
// returns nothing unless a page was deliberately made public.

import { createClient } from "@/lib/supabase/server";

import { parsePublicPeople, parsePublicPersonPage, type PublicPersonEntry, type PublicPersonPage } from "./parse";

export async function getPublicPerson(personId: string): Promise<PublicPersonPage | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_person", { p_person_id: personId });
  return error ? null : parsePublicPersonPage(data);
}

export async function listPublicPeople(): Promise<PublicPersonEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_public_people");
  return error ? [] : parsePublicPeople(data);
}
