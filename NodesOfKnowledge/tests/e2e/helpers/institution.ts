// Disposable institution fixtures for the M6.5 e2e tests. organizations (and
// its M6.5 additions), organization_names / _external_identifiers / _narrative
// / _events, plus events and participations, are all service_role-granted, so
// the established service-role fixture pattern applies. Deleting the
// organization cascades its names, identifiers, narrative, event projections,
// and participations. Institution-neutral content only.

import { getServiceRoleClient } from "./service-role";

type SourceType = "self_reported" | "nominated_by_other" | "admin_entered" | "imported_historical";
type VerificationStatus = "provisional" | "verified_self" | "verified_admin" | "disputed";
type Precision = "day" | "month" | "year" | "decade";

export interface InstitutionInput {
  name: string;
  shortName?: string;
  type?: string;
  status?: string;
  foundingDate?: string;
  foundingPrecision?: Precision;
  foundingIsApproximate?: boolean;
  closureDate?: string;
  closurePrecision?: Precision;
  location?: string;
  website?: string;
  sourceType?: SourceType;
  verificationStatus?: VerificationStatus;
}

export interface Institution {
  id: string;
  name: string;
  url: string;
}

function token(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createInstitution(input: InstitutionInput): Promise<Institution> {
  const supabase = getServiceRoleClient();
  const name = `${input.name} ${token()}`;
  const { data, error } = await supabase
    .from("organizations")
    .insert({
      name,
      short_name: input.shortName ?? null,
      organization_type: input.type ?? null,
      status: input.status ?? "active",
      founding_date: input.foundingDate ?? null,
      founding_precision: input.foundingDate ? input.foundingPrecision ?? "year" : null,
      founding_is_approximate: input.foundingIsApproximate ?? false,
      closure_date: input.closureDate ?? null,
      closure_precision: input.closureDate ? input.closurePrecision ?? "year" : null,
      location: input.location ?? null,
      website: input.website ?? null,
      source_type: input.sourceType ?? "imported_historical",
      verification_status: input.verificationStatus ?? "provisional",
    })
    .select("id, name")
    .single();
  if (error) {
    throw new Error(`createInstitution: ${error.message}`);
  }
  return { id: data.id, name: data.name, url: `/institutions/${data.id}` };
}

export async function deleteInstitution(id: string): Promise<void> {
  const supabase = getServiceRoleClient();
  const { error } = await supabase.from("organizations").delete().eq("id", id);
  if (error) {
    throw new Error(`deleteInstitution: ${error.message}`);
  }
}

export async function addOrganizationName(
  organizationId: string,
  input: { name: string; nameType: string; language?: string; startDate?: string; startPrecision?: Precision; endDate?: string; endPrecision?: Precision; sourceType?: SourceType },
): Promise<void> {
  const supabase = getServiceRoleClient();
  const { error } = await supabase.from("organization_names").insert({
    organization_id: organizationId,
    name: input.name,
    name_type: input.nameType,
    language: input.language ?? null,
    start_date: input.startDate ?? null,
    start_precision: input.startDate ? input.startPrecision ?? "year" : null,
    end_date: input.endDate ?? null,
    end_precision: input.endDate ? input.endPrecision ?? "year" : null,
    source_type: input.sourceType ?? "imported_historical",
  });
  if (error) {
    throw new Error(`addOrganizationName: ${error.message}`);
  }
}

export async function addExternalIdentifier(
  organizationId: string,
  input: { scheme: string; value: string; url?: string; sourceType?: SourceType },
): Promise<void> {
  const supabase = getServiceRoleClient();
  const { error } = await supabase.from("organization_external_identifiers").insert({
    organization_id: organizationId,
    scheme: input.scheme,
    identifier_value: input.value,
    url: input.url ?? null,
    source_type: input.sourceType ?? "imported_historical",
  });
  if (error) {
    throw new Error(`addExternalIdentifier: ${error.message}`);
  }
}

export async function addNarrativeFacet(
  organizationId: string,
  input: { kind: string; body: string; sourceType?: SourceType },
): Promise<void> {
  const supabase = getServiceRoleClient();
  const { error } = await supabase.from("organization_narrative").insert({
    organization_id: organizationId,
    kind: input.kind,
    body: input.body,
    source_type: input.sourceType ?? "imported_historical",
  });
  if (error) {
    throw new Error(`addNarrativeFacet: ${error.message}`);
  }
}

/** Creates a canonical Event and projects it onto the institution's timeline. */
export async function addOrganizationEvent(
  organizationId: string,
  input: { kind?: string; title: string; startDate?: string; startPrecision?: Precision; sourceType?: SourceType },
): Promise<string> {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      event_kind: input.kind ?? "institutional_milestone",
      title: input.title,
      start_date: input.startDate ?? null,
      start_precision: input.startDate ? input.startPrecision ?? "year" : null,
      date_is_unknown: input.startDate ? false : true,
      source_type: input.sourceType ?? "imported_historical",
    })
    .select("id")
    .single();
  if (error) {
    throw new Error(`addOrganizationEvent (event): ${error.message}`);
  }
  const { error: linkError } = await supabase
    .from("organization_events")
    .insert({ organization_id: organizationId, event_id: data.id });
  if (linkError) {
    throw new Error(`addOrganizationEvent (projection): ${linkError.message}`);
  }
  return data.id;
}
