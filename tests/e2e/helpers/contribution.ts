// Disposable contribution fixtures for the M6.6 e2e tests. contributions,
// contribution_kinds / contribution_capacities, person_contributions /
// organization_contributions, contribution_narrative, and contribution_events
// are all service_role-granted, so the established service-role fixture pattern
// applies. Deleting a contribution cascades its attributions, narrative, and
// event projections; canonical events are deleted explicitly (they are
// projected, not owned). Institution-neutral content only.

import { getServiceRoleClient } from "./service-role";

type SourceType = "self_reported" | "nominated_by_other" | "admin_entered" | "imported_historical";
type VerificationStatus = "provisional" | "verified_self" | "verified_admin" | "disputed";
type Precision = "day" | "month" | "year" | "decade";

export interface ContributionInput {
  title: string;
  kind?: string;
  description?: string;
  startDate?: string;
  startPrecision?: Precision;
  endDate?: string;
  endPrecision?: Precision;
  isApproximate?: boolean;
  isOngoing?: boolean;
  dateIsUnknown?: boolean;
  dateIsUncertain?: boolean;
  place?: string;
  sourceType?: SourceType;
  verificationStatus?: VerificationStatus;
}

export interface Contribution {
  id: string;
  title: string;
  url: string;
}

function token(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createContribution(input: ContributionInput): Promise<Contribution> {
  const supabase = getServiceRoleClient();
  const title = `${input.title} ${token()}`;
  const dateIsUnknown = input.dateIsUnknown ?? false;
  const startDate = dateIsUnknown ? null : input.startDate ?? null;
  const startPrecision = dateIsUnknown ? null : startDate ? input.startPrecision ?? "year" : null;
  const endDate = input.endDate ?? null;
  const endPrecision = endDate ? input.endPrecision ?? "year" : null;

  if (!dateIsUnknown && startDate === null) {
    throw new Error("createContribution: a contribution needs either a startDate or dateIsUnknown");
  }

  const { data, error } = await supabase
    .from("contributions")
    .insert({
      title,
      contribution_kind: input.kind ?? "other",
      description: input.description ?? null,
      start_date: startDate,
      start_precision: startPrecision,
      end_date: endDate,
      end_precision: endPrecision,
      is_approximate: input.isApproximate ?? false,
      is_ongoing: input.isOngoing ?? false,
      date_is_unknown: dateIsUnknown,
      date_is_uncertain: input.dateIsUncertain ?? false,
      place: input.place ?? null,
      source_type: input.sourceType ?? "imported_historical",
      verification_status: input.verificationStatus ?? "provisional",
    })
    .select("id, title")
    .single();
  if (error) {
    throw new Error(`createContribution: ${error.message}`);
  }
  return { id: data.id, title: data.title, url: `/contributions/${data.id}` };
}

export async function deleteContribution(id: string): Promise<void> {
  const supabase = getServiceRoleClient();
  const { error } = await supabase.from("contributions").delete().eq("id", id);
  if (error) {
    throw new Error(`deleteContribution: ${error.message}`);
  }
}

export async function addPersonContribution(
  contributionId: string,
  personId: string,
  input: { capacity: string; note?: string; sourceType?: SourceType; verificationStatus?: VerificationStatus },
): Promise<void> {
  const supabase = getServiceRoleClient();
  const { error } = await supabase.from("person_contributions").insert({
    contribution_id: contributionId,
    person_id: personId,
    capacity: input.capacity,
    attribution_note: input.note ?? null,
    source_type: input.sourceType ?? "imported_historical",
    verification_status: input.verificationStatus ?? "provisional",
  });
  if (error) {
    throw new Error(`addPersonContribution: ${error.message}`);
  }
}

export async function addOrganizationContribution(
  contributionId: string,
  organizationId: string,
  input: { capacity: string; note?: string; sourceType?: SourceType; verificationStatus?: VerificationStatus },
): Promise<void> {
  const supabase = getServiceRoleClient();
  const { error } = await supabase.from("organization_contributions").insert({
    contribution_id: contributionId,
    organization_id: organizationId,
    capacity: input.capacity,
    attribution_note: input.note ?? null,
    source_type: input.sourceType ?? "imported_historical",
    verification_status: input.verificationStatus ?? "provisional",
  });
  if (error) {
    throw new Error(`addOrganizationContribution: ${error.message}`);
  }
}

export async function addContributionNarrative(
  contributionId: string,
  input: { kind: string; body: string; sourceType?: SourceType },
): Promise<void> {
  const supabase = getServiceRoleClient();
  const { error } = await supabase.from("contribution_narrative").insert({
    contribution_id: contributionId,
    kind: input.kind,
    body: input.body,
    source_type: input.sourceType ?? "imported_historical",
  });
  if (error) {
    throw new Error(`addContributionNarrative: ${error.message}`);
  }
}

/** Creates a canonical Event and projects it onto the contribution. Returns the
 * event id (track it for cleanup with deleteEvent). */
export async function addContributionEvent(
  contributionId: string,
  input: { kind?: string; title: string; startDate?: string; startPrecision?: Precision; sourceType?: SourceType },
): Promise<string> {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      event_kind: input.kind ?? "other",
      title: input.title,
      start_date: input.startDate ?? null,
      start_precision: input.startDate ? input.startPrecision ?? "year" : null,
      date_is_unknown: input.startDate ? false : true,
      source_type: input.sourceType ?? "imported_historical",
    })
    .select("id")
    .single();
  if (error) {
    throw new Error(`addContributionEvent (event): ${error.message}`);
  }
  const { error: linkError } = await supabase
    .from("contribution_events")
    .insert({ contribution_id: contributionId, event_id: data.id });
  if (linkError) {
    throw new Error(`addContributionEvent (projection): ${linkError.message}`);
  }
  return data.id;
}
