// Server-only reads for the outcomes panel. The database gates by institution.

import { createClient } from "@/lib/supabase/server";

import { parseOutcomeExport, parseOutcomes } from "./parse";
import type { OutcomeExportRow, OutcomeFilters, OutcomesDocument } from "./types";

export { readOutcomeParams } from "./parse";
export type { OutcomeFilters };

function args(organizationId: string, f: OutcomeFilters) {
  return {
    p_organization_id: organizationId,
    ...(f.programme ? { p_programme: f.programme } : {}),
    ...(f.fromYear ? { p_from_year: f.fromYear } : {}),
    ...(f.toYear ? { p_to_year: f.toYear } : {}),
  };
}

export async function getOutcomes(organizationId: string, filters: OutcomeFilters): Promise<OutcomesDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_outcomes", args(organizationId, filters));
  return error ? null : parseOutcomes(data);
}

export async function getOutcomeExport(organizationId: string, filters: OutcomeFilters): Promise<OutcomeExportRow[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_outcomes_export", args(organizationId, filters));
  return error ? null : parseOutcomeExport(data);
}
