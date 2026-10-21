// Server-only reads for the steward console. Each wraps one reviewer-gated
// database function (the database is the authorization boundary) and fails
// closed: null / empty on any error or unrecognizable result.

import { createClient } from "@/lib/supabase/server";

import {
  parseStewardScope,
  parseCorpusTimeline,
  parseDemoSummary,
  parseStewardAttention,
  parseStewardOverview,
} from "./parse";
import type { CorpusDecade, DemoSummary, StewardAttention, StewardOverview, StewardScope } from "./types";

export async function getStewardOverview(organizationId?: string): Promise<StewardOverview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_overview", organizationId ? { p_organization_id: organizationId } : {});
  return error ? null : parseStewardOverview(data);
}

export async function getStewardAttention(organizationId?: string): Promise<StewardAttention | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_attention", organizationId ? { p_organization_id: organizationId } : {});
  return error ? null : parseStewardAttention(data);
}

export async function getCorpusTimeline(organizationId?: string): Promise<CorpusDecade[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_corpus_timeline", organizationId ? { p_organization_id: organizationId } : {});
  return error ? [] : parseCorpusTimeline(data);
}

export async function getDemoSummary(): Promise<DemoSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_demo_summary");
  return error ? null : parseDemoSummary(data);
}

/** Whether any demonstration record exists. Callable signed out. Fails to
 * `true` on error: when unsure, the honest label is "this may be fictional". */
export async function hasDemoData(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_demo_data");
  return error ? true : data === true;
}

/** The caller's steward reach. Fails closed to "no reach". */
export async function getStewardScope(): Promise<StewardScope> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_steward_scope");
  return error ? { platform: false, organizations: [] } : parseStewardScope(data);
}

export interface InstitutionStewardRow {
  id: string;
  organizationId: string;
  organizationName: string;
  email: string;
  grantedAt: string;
}

export async function listInstitutionStewards(): Promise<InstitutionStewardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_list_institution_stewards");
  if (error || !Array.isArray(data)) return [];
  return data.map((r) => ({
    id: r.id,
    organizationId: r.organization_id,
    organizationName: r.organization_name,
    email: r.email,
    grantedAt: r.granted_at,
  }));
}
