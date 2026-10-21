// Server-only reads for the reading directories. Each wraps a bounded
// SECURITY DEFINER list_* read model (the authorization/visibility
// boundary) and fails closed to an empty list on any error or
// unrecognizable result — the pages then render an honest empty state.

import { createClient } from "@/lib/supabase/server";

import {
  parseContributionsIndex,
  parseInstitutionsIndex,
  parsePeopleIndex,
} from "./parse";
import type {
  ContributionIndexEntry,
  InstitutionIndexEntry,
  PersonIndexEntry,
} from "./types";

export async function getPeopleIndex(): Promise<PersonIndexEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_people");
  if (error || data === null || data === undefined) return [];
  return parsePeopleIndex(data);
}

export async function getInstitutionsIndex(): Promise<InstitutionIndexEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_organizations");
  if (error || data === null || data === undefined) return [];
  return parseInstitutionsIndex(data);
}

export async function getContributionsIndex(): Promise<ContributionIndexEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_contributions");
  if (error || data === null || data === undefined) return [];
  return parseContributionsIndex(data);
}
