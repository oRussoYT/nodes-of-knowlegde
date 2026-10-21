// Disposable Knowledge Network fixtures for the M7 e2e tests. The new
// organization_relationships table and the existing person_events /
// organization_events join tables are service_role-granted, so the established
// service-role fixture pattern applies directly. The other network edges
// (participations, relationships, person/organization contributions,
// contribution_events) are seeded through the existing M6 helpers.
// Institution-neutral content only.

import { getServiceRoleClient } from "./service-role";

type SourceType = "self_reported" | "nominated_by_other" | "admin_entered" | "imported_historical";
type VerificationStatus = "provisional" | "verified_self" | "verified_admin" | "disputed";
type Precision = "day" | "month" | "year" | "decade";

export interface OrgRelationshipInput {
  kind: string;
  isDirectional: boolean;
  note?: string;
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

/**
 * Records ONE canonical institutional relationship between two organizations.
 * For a directional kind, source/target keep their meaning. For a symmetric
 * kind, the pair is stored in canonical order (source < target) to satisfy the
 * DB's canonical-reciprocal constraint, so callers may pass the two ids in any
 * order. Returns the new relationship id (track it for cleanup).
 */
export async function addOrganizationRelationship(
  sourceOrgId: string,
  targetOrgId: string,
  input: OrgRelationshipInput,
): Promise<string> {
  const supabase = getServiceRoleClient();

  let sourceId = sourceOrgId;
  let targetId = targetOrgId;
  if (!input.isDirectional && sourceId > targetId) {
    [sourceId, targetId] = [targetId, sourceId];
  }

  const dateIsUnknown = input.dateIsUnknown ?? false;
  const startDate = dateIsUnknown ? null : input.startDate ?? null;
  const startPrecision = dateIsUnknown ? null : startDate ? input.startPrecision ?? "year" : null;
  const endDate = input.endDate ?? null;
  const endPrecision = endDate ? input.endPrecision ?? "year" : null;

  if (!dateIsUnknown && startDate === null) {
    throw new Error("addOrganizationRelationship: needs either a startDate or dateIsUnknown");
  }

  const { data, error } = await supabase
    .from("organization_relationships")
    .insert({
      kind: input.kind,
      is_directional: input.isDirectional,
      source_organization_id: sourceId,
      target_organization_id: targetId,
      note: input.note ?? null,
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
    throw new Error(`addOrganizationRelationship: ${error.message}`);
  }

  return data.id;
}

export async function deleteOrganizationRelationship(id: string): Promise<void> {
  const supabase = getServiceRoleClient();
  const { error } = await supabase.from("organization_relationships").delete().eq("id", id);
  if (error) {
    throw new Error(`deleteOrganizationRelationship: ${error.message}`);
  }
}

/** Projects an existing canonical event onto a person (person_events). The row
 * cascades when the event is deleted. */
export async function addPersonEvent(personId: string, eventId: string): Promise<void> {
  const supabase = getServiceRoleClient();
  const { error } = await supabase.from("person_events").insert({ person_id: personId, event_id: eventId });
  if (error) {
    throw new Error(`addPersonEvent: ${error.message}`);
  }
}

/** Projects an existing canonical event onto an organization (organization_events). */
export async function addOrganizationEvent(organizationId: string, eventId: string): Promise<void> {
  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from("organization_events")
    .insert({ organization_id: organizationId, event_id: eventId });
  if (error) {
    throw new Error(`addOrganizationEvent: ${error.message}`);
  }
}
