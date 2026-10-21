// Disposable relationship fixtures for the M6.4 e2e tests. relationships and
// relationship_kinds are granted to service_role by the relationship migration
// (consistent with people/events/participations -- service_role is the trusted
// backend, never a client role), so the established service-role fixture
// pattern applies directly, giving each test its own isolated, disposable
// relationships. Institution-neutral content only.

import { getServiceRoleClient } from "./service-role";

type SourceType = "self_reported" | "nominated_by_other" | "admin_entered" | "imported_historical";
type VerificationStatus = "provisional" | "verified_self" | "verified_admin" | "disputed";
type Precision = "day" | "month" | "year" | "decade";

export interface RelationshipInput {
  kind: string;
  isDirectional: boolean;
  narrative?: string;
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
 * Records ONE canonical relationship between two people. For a directional
 * kind, source/target keep their meaning. For a symmetric kind, the pair is
 * stored in canonical order (source < target) to satisfy the DB's
 * canonical-reciprocal constraint, so callers may pass the two ids in any
 * order. Fills in a coherent temporal shape (year precision by default; an
 * undated bond clears the date fields). Returns the new relationship id.
 */
export async function addRelationship(personAId: string, personBId: string, input: RelationshipInput): Promise<string> {
  const supabase = getServiceRoleClient();

  let sourceId = personAId;
  let targetId = personBId;
  if (!input.isDirectional && sourceId > targetId) {
    [sourceId, targetId] = [targetId, sourceId];
  }

  const dateIsUnknown = input.dateIsUnknown ?? false;
  const startDate = dateIsUnknown ? null : input.startDate ?? null;
  const startPrecision = dateIsUnknown ? null : startDate ? input.startPrecision ?? "year" : null;
  const endDate = input.endDate ?? null;
  const endPrecision = endDate ? input.endPrecision ?? "year" : null;

  if (!dateIsUnknown && startDate === null) {
    throw new Error("addRelationship: a relationship needs either a startDate or dateIsUnknown");
  }

  const { data, error } = await supabase
    .from("relationships")
    .insert({
      kind: input.kind,
      is_directional: input.isDirectional,
      source_person_id: sourceId,
      target_person_id: targetId,
      narrative: input.narrative ?? null,
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
    throw new Error(`addRelationship: ${error.message}`);
  }

  return data.id;
}

/** Deletes a relationship. */
export async function deleteRelationship(id: string): Promise<void> {
  const supabase = getServiceRoleClient();
  const { error } = await supabase.from("relationships").delete().eq("id", id);
  if (error) {
    throw new Error(`deleteRelationship: ${error.message}`);
  }
}
