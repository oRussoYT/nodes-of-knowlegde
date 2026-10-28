// Server-only reads for the university package. The database gates by institution.

import type { OutcomeFilters } from "@/features/outcomes/types";
import { createClient } from "@/lib/supabase/server";

import { parseCapesRows, parsePlanRequests, parseUniversityReport, type CapesRow, type PlanRequest, type UniversityReport } from "./parse";

function args(organizationId: string, f: OutcomeFilters) {
  return {
    p_organization_id: organizationId,
    ...(f.programme ? { p_programme: f.programme } : {}),
    ...(f.fromYear ? { p_from_year: f.fromYear } : {}),
    ...(f.toYear ? { p_to_year: f.toYear } : {}),
  };
}

export async function getUniversityReport(organizationId: string, filters: OutcomeFilters, homeCountry: string): Promise<UniversityReport | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_university_report", { ...args(organizationId, filters), p_home_country: homeCountry });
  return error ? null : parseUniversityReport(data);
}

export async function getCapesExport(organizationId: string, filters: OutcomeFilters): Promise<CapesRow[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_capes_export", args(organizationId, filters));
  return error ? null : parseCapesRows(data);
}

export async function getMyPlanRequests(): Promise<PlanRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_plan_requests");
  return error ? [] : parsePlanRequests(data);
}

export async function getPlanRequestQueue(): Promise<PlanRequest[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_list_plan_requests");
  return error ? null : parsePlanRequests(data);
}

/** Reads a two-letter home country from the URL (default Brazil). */
export function readHomeCountry(v: string | null): string {
  return v && /^[A-Za-z]{2}$/.test(v) ? v.toUpperCase() : "BR";
}
