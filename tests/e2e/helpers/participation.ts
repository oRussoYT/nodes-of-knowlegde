// Disposable participation fixtures for the M6.3 e2e tests. organizations,
// participations, and participation_capacities are granted to service_role by
// the participation migration (consistent with people/events -- service_role
// is the trusted backend, never a client role), so the established
// service-role fixture pattern applies directly, giving each test its own
// isolated, disposable organizations and participations. Institution-neutral
// content only.

import { getServiceRoleClient } from "./service-role";

type SourceType = "self_reported" | "nominated_by_other" | "admin_entered" | "imported_historical";
type VerificationStatus = "provisional" | "verified_self" | "verified_admin" | "disputed";
type Precision = "day" | "month" | "year" | "decade";

export interface ParticipationInput {
  capacity?: string;
  summary?: string;
  startDate?: string;
  startPrecision?: Precision;
  endDate?: string;
  endPrecision?: Precision;
  isApproximate?: boolean;
  isOngoing?: boolean;
  dateIsUnknown?: boolean;
  dateIsUncertain?: boolean;
  sourceType?: SourceType;
  verificationStatus?: VerificationStatus;
}

/** Creates a disposable organization (the belonging target). Returns its id. */
export async function addOrganization(name: string, shortName?: string): Promise<string> {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("organizations")
    .insert({ name, short_name: shortName ?? null })
    .select("id")
    .single();
  if (error) {
    throw new Error(`addOrganization: ${error.message}`);
  }
  return data.id;
}

/** Deletes an organization (its participations cascade). */
export async function deleteOrganization(id: string): Promise<void> {
  const supabase = getServiceRoleClient();
  const { error } = await supabase.from("organizations").delete().eq("id", id);
  if (error) {
    throw new Error(`deleteOrganization: ${error.message}`);
  }
}

/**
 * Records a participation (bounded belonging) of a person at an organization.
 * Fills in a coherent temporal shape: a dated belonging defaults to year
 * precision; an undated belonging clears the date fields. Throws if neither a
 * start date nor dateIsUnknown is given (the schema forbids a silently dateless
 * participation). Returns the new participation id (track it for cleanup).
 */
export async function addParticipation(personId: string, organizationId: string, input: ParticipationInput): Promise<string> {
  const supabase = getServiceRoleClient();

  const dateIsUnknown = input.dateIsUnknown ?? false;
  const startDate = dateIsUnknown ? null : input.startDate ?? null;
  const startPrecision = dateIsUnknown ? null : startDate ? input.startPrecision ?? "year" : null;
  const endDate = input.endDate ?? null;
  const endPrecision = endDate ? input.endPrecision ?? "year" : null;

  if (!dateIsUnknown && startDate === null) {
    throw new Error("addParticipation: a participation needs either a startDate or dateIsUnknown");
  }

  const { data, error } = await supabase
    .from("participations")
    .insert({
      person_id: personId,
      organization_id: organizationId,
      capacity: input.capacity ?? "researcher",
      summary: input.summary ?? null,
      start_date: startDate,
      start_precision: startPrecision,
      end_date: endDate,
      end_precision: endPrecision,
      is_approximate: input.isApproximate ?? false,
      is_ongoing: input.isOngoing ?? false,
      date_is_unknown: dateIsUnknown,
      date_is_uncertain: input.dateIsUncertain ?? false,
      source_type: input.sourceType ?? "imported_historical",
      verification_status: input.verificationStatus ?? "provisional",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`addParticipation: ${error.message}`);
  }

  return data.id;
}

/** Deletes a participation. */
export async function deleteParticipation(id: string): Promise<void> {
  const supabase = getServiceRoleClient();
  const { error } = await supabase.from("participations").delete().eq("id", id);
  if (error) {
    throw new Error(`deleteParticipation: ${error.message}`);
  }
}
